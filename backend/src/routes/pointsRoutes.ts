import { Router } from 'express';
import {
  assignPoints,
  getYoungTotalPoints,
  getYoungPointsBreakdown,
  getYoungHistory,
  getAllTransactions,
  deleteTransaction,
} from '../controllers/pointsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas protegidas - Requieren autenticación

// Asignar puntos manualmente (admin)
router.post('/assign', authenticateToken, assignPoints);

// Obtener puntos de un joven
router.get('/young/:youngId/total', authenticateToken, getYoungTotalPoints);
router.get(
  '/young/:youngId/breakdown',
  authenticateToken,
  getYoungPointsBreakdown
);
router.get('/young/:youngId/history', authenticateToken, getYoungHistory);

// Obtener todas las transacciones (admin)
router.get('/transactions', authenticateToken, getAllTransactions);

// Eliminar transacción (admin - solo para correcciones)
router.delete('/transactions/:id', authenticateToken, deleteTransaction);

export default router;
