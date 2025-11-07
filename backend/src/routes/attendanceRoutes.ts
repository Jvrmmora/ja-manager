import express from 'express';
import { authenticateToken, requireScope } from '../middleware/auth';
import {
  scanQRAndRegisterAttendance,
  manualRegisterAttendance,
  getMyAttendanceHistory,
  getTodayAttendances,
  getAttendancesByDate,
  getAttendanceStats,
} from '../controllers/attendanceController';

const router = express.Router();

// Escanear QR y registrar asistencia
router.post('/scan', authenticateToken, scanQRAndRegisterAttendance);
router.post('/manual', authenticateToken, manualRegisterAttendance);

// Obtener mi historial de asistencias
router.get('/my-history', authenticateToken, getMyAttendanceHistory);

// Obtener lista de asistencias del día (solo administradores)
router.get('/today', authenticateToken, getTodayAttendances);

// Obtener lista de asistencias por fecha específica (solo administradores)
router.get('/date/:date', authenticateToken, getAttendancesByDate);

// Obtener estadísticas de asistencia (solo administradores)
router.get('/stats', authenticateToken, getAttendanceStats);

export default router;
