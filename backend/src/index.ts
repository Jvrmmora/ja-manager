import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import type { Server } from 'http';
import { env } from './config/env';
import youngRoutes from './routes/youngRoutes';
import importRoutes from './routes/importRoutes';
import authRoutes from './routes/authRoutes';
import qrRoutes from './routes/qrRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import seasonRoutes from './routes/seasonRoutes';
import pointsRoutes from './routes/pointsRoutes';
import registrationRoutes from './routes/registrationRoutes';
import birthdayRoutes from './routes/birthdayRoutes';
import landingRoutes from './routes/landingRoutes';
import contactRoutes from './routes/contactRoutes';
import { DatabaseSeeder } from './seeders/DatabaseSeeder';
import { startBirthdayScheduler } from './services/birthdayScheduler';
import { authenticateToken } from './middleware/auth';
import { ensureDatabaseConnection } from './middleware/databaseCheck';
import { connectDatabase } from './config/database';
import logger from './utils/logger';
import {
  httpLoggingMiddleware,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
} from './middleware/logging';
import {
  globalErrorHandler,
  notFoundHandler,
  jsonErrorHandler,
  contentTypeValidator,
  timeoutHandler,
} from './middleware/errorMiddleware';

const app = express();
const PORT = env.port;

// Detrás de Azure Web App / Static Web Apps / nginx: confiar en el primer proxy
// para que req.ip y los rate-limiters basados en X-Forwarded-For sean fiables.
app.set('trust proxy', 1);

// Configurar CORS con variables de entorno
const corsOrigins = env.corsOrigin
  ? env.corsOrigin.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

// Cabeceras de seguridad. La API sólo devuelve JSON, así que no necesita CSP
// propia, pero sí HSTS, anti-sniffing y anti-clickjacking.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(compression());

// Middleware
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware de timeout global
app.use(timeoutHandler(30000)); // 30 segundos

// Middleware de logging HTTP
app.use(httpLoggingMiddleware);

// Middleware de parsing. Los archivos se suben vía multipart/form-data (multer),
// así que el body JSON no necesita ser grande.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Middleware de validación de Content-Type
app.use(contentTypeValidator);

// Middleware de logging detallado (solo en desarrollo)
if (!env.isProduction) {
  app.use(requestLoggingMiddleware);
}

// Middleware de manejo de errores JSON
app.use(jsonErrorHandler);

let server: Server | undefined;
let shuttingDown = false;

// Conectar a MongoDB y ejecutar seeders
const initializeApp = async () => {
  try {
    // Conectar a la base de datos ANTES de iniciar el servidor
    await connectDatabase();

    // Verificar que la conexión esté activa
    if (mongoose.connection.readyState !== 1) {
      throw new Error('La conexión a MongoDB no está activa');
    }

    // Ejecutar seeders
    await DatabaseSeeder.runAllSeeders();

    // Iniciar scheduler de cumpleaños
    startBirthdayScheduler();

    // Configurar rutas después de que la BD esté lista
    setupRoutes();

    // Iniciar servidor solo después de que la BD esté lista
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`, {
        port: PORT,
        env: env.nodeEnv,
        nodeVersion: process.version,
        mongoState: mongoose.connection.readyState,
      });
      logger.info(`💚 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📚 Documentación: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Error fatal al inicializar la aplicación', { error });
    process.exit(1);
  }
};

// Configurar rutas y middleware que requieren BD
const setupRoutes = () => {
  // Cargar documentación OpenAPI desde archivo YAML
  // Detectar automáticamente si estamos en desarrollo o producción
  const yamlPath = env.isProduction
    ? path.join(process.cwd(), 'dist/docs/oas3.yaml') // Producción: usar archivo compilado
    : path.join(process.cwd(), 'src/docs/oas3.yaml'); // Desarrollo: usar archivo fuente

  let swaggerDocument;
  try {
    swaggerDocument = YAML.load(yamlPath);
  } catch (error) {
    logger.warn(`No se pudo cargar la documentación OpenAPI desde ${yamlPath}`, {
      error,
    });
    // Crear documentación básica como fallback
    swaggerDocument = {
      openapi: '3.0.0',
      info: {
        title: 'Youth Management API',
        version: '1.0.0',
        description: 'API para gestión de jóvenes de la iglesia',
      },
      paths: {},
    };
  }

  // Health check - debe ir ANTES de las rutas de young
  app.get('/api/health', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    res.status(dbState === 1 ? 200 : 503).json({
      status: dbState === 1 ? 'OK' : 'DEGRADED',
      message: 'Youth Management API',
      timestamp: new Date().toISOString(),
      dbState,
    });
  });

  // Documentación OpenAPI (antes era Swagger)
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Youth Management API Documentation',
      explorer: true,
    })
  );

  // Rutas de autenticación (algunas requieren BD pero no autenticación previa)
  app.use('/api/auth', ensureDatabaseConnection, authRoutes);

  // Rutas de landing (públicas para GET, protegidas para admin)
  app.use('/api/landing', ensureDatabaseConnection, landingRoutes);

  // Rutas de registro (públicas para crear solicitud, protegidas para gestión)
  app.use('/api/registration', ensureDatabaseConnection, registrationRoutes);

  // Rutas protegidas que requieren autenticación y conexión a BD
  app.use('/api/young', ensureDatabaseConnection, authenticateToken, youngRoutes);
  app.use(
    '/api/import',
    ensureDatabaseConnection,
    authenticateToken,
    importRoutes
  );
  app.use('/api/qr', ensureDatabaseConnection, authenticateToken, qrRoutes);
  app.use(
    '/api/attendance',
    ensureDatabaseConnection,
    authenticateToken,
    attendanceRoutes
  );

  // Rutas de puntos y temporadas (sistema de gamificación)
  app.use('/api/seasons', ensureDatabaseConnection, seasonRoutes);
  app.use('/api/points', ensureDatabaseConnection, pointsRoutes);

  // Rutas de cumpleaños
  app.use('/api/birthday', ensureDatabaseConnection, birthdayRoutes);

  // Ruta publica de contacto + listado admin protegido
  app.use('/api/contact', ensureDatabaseConnection, contactRoutes);

  // Ruta por defecto
  app.get('/', (_req, res) => {
    res.json({
      message: 'Youth Management Platform API',
      version: '1.0.0',
      documentation: '/api/docs',
      health: '/api/health',
    });
  });

  // Middleware de logging de errores
  app.use(errorLoggingMiddleware);

  // Middleware para rutas no encontradas
  app.use(notFoundHandler);

  // Middleware global de manejo de errores (debe ir al final)
  app.use(globalErrorHandler);
};

/**
 * Apagado controlado: deja de aceptar conexiones nuevas, espera a que terminen
 * las en curso y cierra la conexión a Mongo. Docker y Azure envían SIGTERM.
 */
const gracefulShutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`🛑 Recibida señal ${signal}, cerrando de forma controlada...`);

  const forceExit = setTimeout(() => {
    logger.error('⏱️  Apagado forzado tras timeout');
    process.exit(1);
  }, 15000);
  forceExit.unref();

  const closeDb = () => {
    mongoose.connection
      .close(false)
      .then(() => {
        logger.info('✅ Conexión a MongoDB cerrada. Adiós.');
        clearTimeout(forceExit);
        process.exit(0);
      })
      .catch(error => {
        logger.error('Error cerrando MongoDB', { error });
        process.exit(1);
      });
  };

  if (server) {
    server.close(() => closeDb());
  } else {
    closeDb();
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', reason => {
  logger.error('unhandledRejection', { reason });
});

process.on('uncaughtException', error => {
  logger.error('uncaughtException', { error });
  gracefulShutdown('uncaughtException');
});

// Inicializar la aplicación
initializeApp();

export default app;
