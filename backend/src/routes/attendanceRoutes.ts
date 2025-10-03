import express from 'express';
import { authenticateToken, requireScope } from '../middleware/auth';
import {
  scanQRAndRegisterAttendance,
  getMyAttendanceHistory,
  getTodayAttendances,
  getAttendanceStats,
} from '../controllers/attendanceController';

const router = express.Router();

/**
 * @swagger
 * /api/attendance/scan:
 *   post:
 *     summary: Escanear QR y registrar asistencia
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código UUID del QR escaneado
 *     responses:
 *       201:
 *         description: Asistencia registrada exitosamente
 *       400:
 *         description: QR expirado o datos inválidos
 *       404:
 *         description: QR no encontrado
 *       409:
 *         description: Ya se registró asistencia hoy
 */
router.post('/scan', authenticateToken, scanQRAndRegisterAttendance);

/**
 * @swagger
 * /api/attendance/my-history:
 *   get:
 *     summary: Obtener mi historial de asistencias
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Elementos por página
 *     responses:
 *       200:
 *         description: Historial obtenido exitosamente
 */
router.get('/my-history', authenticateToken, getMyAttendanceHistory);

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Obtener lista de asistencias del día (solo administradores)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista obtenida exitosamente
 *       403:
 *         description: Solo administradores
 */
router.get('/today', authenticateToken, getTodayAttendances);

/**
 * @swagger
 * /api/attendance/stats:
 *   get:
 *     summary: Obtener estadísticas de asistencia (solo administradores)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 */
router.get('/stats', authenticateToken, getAttendanceStats);

export default router;