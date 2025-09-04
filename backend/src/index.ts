import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import youngRoutes from './routes/youngRoutes';
import importRoutes from './routes/importRoutes';
import authRoutes from './routes/authRoutes';
import { specs } from './config/swagger';
import { DatabaseSeeder } from './seeders/DatabaseSeeder';
import { authenticateToken } from './middleware/auth';
import { connectDatabase } from './config/database';
import logger from './utils/logger';
import { 
  httpLoggingMiddleware, 
  requestLoggingMiddleware, 
  errorLoggingMiddleware 
} from './middleware/logging';
import { 
  globalErrorHandler, 
  notFoundHandler, 
  jsonErrorHandler,
  contentTypeValidator,
  timeoutHandler
} from './middleware/errorMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar CORS con variables de entorno
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173'
    ];

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
connectDatabase().then(async () => {
  try {
    // Ejecutar seeders
    await DatabaseSeeder.runAllSeeders();
  } catch (error) {
    logger.error('Error ejecutando seeders:', error);
  }
});

// Health check - debe ir ANTES de las rutas de young
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Youth Management API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Youth Management API Documentation',
  explorer: true
}));

// Rutas de autenticación (sin middleware de autenticación)
app.use('/api/auth', authRoutes);

// Rutas protegidas que requieren autenticación
app.use('/api/young', authenticateToken, youngRoutes);
app.use('/api/import', authenticateToken, importRoutes);

// Ruta por defecto
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Youth Management Platform API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: [
      'GET /api/health - Verificar estado',
      'GET /api/docs - Documentación Swagger',
      'POST /api/auth/login - Iniciar sesión',
      'GET /api/auth/profile - Perfil usuario (autenticado)',
      'POST /api/auth/logout - Cerrar sesión (autenticado)',
      'GET /api/young - Obtener jóvenes (autenticado)',
      'POST /api/young - Crear joven (autenticado)',
      'GET /api/young/stats - Estadísticas (autenticado)',
      'GET /api/young/:id - Obtener joven por ID (autenticado)',
      'PUT /api/young/:id - Actualizar joven (autenticado)',
      'DELETE /api/young/:id - Eliminar joven (autenticado)',
      'POST /api/import/import - Importar desde Excel (autenticado)',
      'GET /api/import/template - Descargar plantilla (autenticado)',
      'GET /api/import/export - Exportar a Excel (autenticado)'
    ]
  });
});

// Middleware de logging de errores
app.use(errorLoggingMiddleware);

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware global de manejo de errores (debe ir al final)
app.use(globalErrorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  logger.info(`📱 API disponible en: http://localhost:${PORT}`);
  logger.info(`💚 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`📚 Documentación: http://localhost:${PORT}/api/docs`);
});

export default app;
