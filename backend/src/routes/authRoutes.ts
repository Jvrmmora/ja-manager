import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas (sin autenticación)
router.post('/login', AuthController.login);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);

// Ruta de prueba de email (solo admin)
router.post('/test-email', authenticateToken, AuthController.testEmail);

export default router;
