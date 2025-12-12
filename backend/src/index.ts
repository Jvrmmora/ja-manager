import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import youngRoutes from './routes/youngRoutes';
import importRoutes from './routes/importRoutes';
import authRoutes from './routes/authRoutes';
import qrRoutes from './routes/qrRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import seasonRoutes from './routes/seasonRoutes';
import pointsRoutes from './routes/pointsRoutes';
import registrationRoutes from './routes/registrationRoutes';
import birthdayRoutes from './routes/birthdayRoutes';
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

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Configurar CORS con variables de entorno
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

// Middleware
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middleware de timeout global
app.use(timeoutHandler(30000)); // 30 segundos

// Middleware de logging HTTP
app.use(httpLoggingMiddleware);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de validación de Content-Type
app.use(contentTypeValidator);

// Middleware de logging detallado (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLoggingMiddleware);
}

// Middleware de manejo de errores JSON
app.use(jsonErrorHandler);

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
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        mongoState: mongoose.connection.readyState,
      });
      logger.info(`📱 API disponible en: http://localhost:${PORT}`);
      logger.info(`🌐 API disponible en red: http://192.168.1.9:${PORT}`);
      logger.info(`💚 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📚 Documentación: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Error fatal al inicializar la aplicación:', error);
    process.exit(1);
  }
};

// Configurar rutas y middleware que requieren BD
const setupRoutes = () => {
  // Cargar documentación OpenAPI desde archivo YAML
  // Detectar automáticamente si estamos en desarrollo o producción
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const yamlPath = isDevelopment
    ? path.join(process.cwd(), 'src/docs/oas3.yaml') // Desarrollo: usar archivo fuente
    : path.join(process.cwd(), 'dist/docs/oas3.yaml'); // Producción: usar archivo compilado

  let swaggerDocument;
  try {
    swaggerDocument = YAML.load(yamlPath);
  } catch (error) {
    logger.warn(
      `No se pudo cargar la documentación OpenAPI desde ${yamlPath}:`,
      error
    );
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
    res.json({
      status: 'OK',
      message: 'Youth Management API funcionando correctamente',
      timestamp: new Date().toISOString(),
      dbState: mongoose.connection.readyState,
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

  // Rutas de registro (públicas para crear solicitud, protegidas para gestión)
  app.use('/api/registration', ensureDatabaseConnection, registrationRoutes);

  // Rutas protegidas que requieren autenticación y conexión a BD
  app.use(
    '/api/young',
    ensureDatabaseConnection,
    authenticateToken,
    youngRoutes
  );
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

  // Ruta por defecto
  app.get('/', (_req, res) => {
    res.json({
      message: 'Youth Management Platform API',
      version: '1.0.0',
      documentation: '/api/docs',
      dbState: mongoose.connection.readyState,
      endpoints: [
        'GET /api/health - Verificar estado',
        'GET /api/docs - Documentación Swagger',
        'POST /api/auth/login - Iniciar sesión',
        'GET /api/auth/profile - Perfil usuario (autenticado)',
        'POST /api/auth/logout - Cerrar sesión (autenticado)',
        'POST /api/auth/test-email - Enviar email de prueba (admin)',
        'GET /api/young - Obtener jóvenes (autenticado)',
        'POST /api/young - Crear joven (autenticado)',
        'GET /api/young/stats - Estadísticas (autenticado)',
        'GET /api/young/:id - Obtener joven por ID (autenticado)',
        'PUT /api/young/:id - Actualizar joven (autenticado)',
        'DELETE /api/young/:id - Eliminar joven (autenticado)',
        'POST /api/import/import - Importar desde Excel (autenticado)',
        'GET /api/import/template - Descargar plantilla (autenticado)',
        'GET /api/import/export - Exportar a Excel (autenticado)',
        'POST /api/qr/generate - Generar QR del día (admin)',
        'GET /api/qr/current - Obtener QR activo (autenticado)',
        'GET /api/qr/stats - Estadísticas QR (autenticado)',
        'POST /api/attendance/scan - Escanear QR y registrar (joven)',
        'GET /api/attendance/my-history - Mi historial (joven)',
        'GET /api/attendance/today - Lista del día (admin)',
        'GET /api/attendance/stats - Estadísticas asistencia (admin)',
      ],
    });
  });

  // Middleware de logging de errores
  app.use(errorLoggingMiddleware);

  // Middleware para rutas no encontradas
  app.use(notFoundHandler);

  // Middleware global de manejo de errores (debe ir al final)
  app.use(globalErrorHandler);
};

// Inicializar la aplicación
initializeApp();

export default app;
