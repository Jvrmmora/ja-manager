import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rutas públicas (sin autenticación). El login lleva rate-limiting para
// mitigar fuerza bruta / credential stuffing.
router.post('/login', loginLimiter, AuthController.login);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);

// Ruta de prueba de email (solo admin)
router.post('/test-email', authenticateToken, AuthController.testEmail);

export default router;
