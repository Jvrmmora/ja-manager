import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import youngRoutes from './routes/youngRoutes';
import importRoutes from './routes/importRoutes';
import { specs } from './config/swagger';

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
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/youth-management')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((error) => console.error('❌ Error conectando a MongoDB:', error));

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

// Rutas de jóvenes
app.use('/api/young', youngRoutes);

// Rutas de importación
app.use('/api/import', importRoutes);

// Ruta por defecto
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Youth Management Platform API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: [
      'GET /api/health',
      'GET /api/docs - Documentación Swagger',
      'GET /api/young - Obtener jóvenes',
      'POST /api/young - Crear joven',
      'GET /api/young/stats - Estadísticas',
      'GET /api/young/:id - Obtener joven por ID',
      'PUT /api/young/:id - Actualizar joven',
      'DELETE /api/young/:id - Eliminar joven',
      'POST /api/import/import - Importar desde Excel',
      'GET /api/import/template - Descargar plantilla',
      'GET /api/import/export - Exportar a Excel'
    ]
  });
});

// Middleware de manejo de errores - usar _ para parámetros no utilizados
app.use((error: any, _req: any, res: any, _next: any) => {
  console.error('❌ Error:', error);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📱 API disponible en: http://localhost:${PORT}`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});

export default app;
