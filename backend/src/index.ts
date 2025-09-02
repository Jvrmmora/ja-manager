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
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    // Ejecutar seeders para datos iniciales
    try {
      await DatabaseSeeder.runAllSeeders();
    } catch (error) {
      console.error('⚠️  Error ejecutando seeders:', error);
    }
  })
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
