import express from 'express';
import { authenticateToken, requireScope } from '../middleware/auth';
import {
  generateDailyQR,
  getCurrentQR,
  getQRStats,
} from '../controllers/qrController';

const router = express.Router();

/**
 * @swagger
 * /api/qr/generate:
 *   post:
 *     summary: Generar QR del día (solo administradores)
 *     tags: [QR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: QR generado exitosamente
 *       200:
 *         description: QR activo encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Solo administradores
 */
router.post('/generate', authenticateToken, generateDailyQR);

/**
 * @swagger
 * /api/qr/current:
 *   get:
 *     summary: Obtener QR activo del día
 *     tags: [QR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR activo encontrado
 *       404:
 *         description: No hay QR activo
 */
router.get('/current', authenticateToken, getCurrentQR);

/**
 * @swagger
 * /api/qr/stats:
 *   get:
 *     summary: Obtener estadísticas del QR actual
 *     tags: [QR]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/stats', authenticateToken, getQRStats);

export default router;