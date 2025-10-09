import express from 'express';
import { authenticateToken, requireScope } from '../middleware/auth';
import {
  generateDailyQR,
  getCurrentQR,
  getQRStats,
} from '../controllers/qrController';

const router = express.Router();

// Generar QR del día (solo administradores)
router.post('/generate', authenticateToken, generateDailyQR);

// Obtener QR activo del día
router.get('/current', authenticateToken, getCurrentQR);

// Obtener estadísticas del QR actual
router.get('/stats', authenticateToken, getQRStats);

export default router;