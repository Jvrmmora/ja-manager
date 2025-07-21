import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import youngRoutes from './routes/youngRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

// Rutas de jóvenes
app.use('/api/young', youngRoutes);

// Ruta por defecto
app.get('/', (_req, res) => {
  res.json({ 
    message: 'Youth Management Platform API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/young',
      'POST /api/young',
      'PUT /api/young/:id',
      'DELETE /api/young/:id'
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
