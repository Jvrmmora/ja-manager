import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import {
  loginLimiter,
  forgotPasswordLimiter,
  verifyResetCodeLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimiter';

const router = Router();

// Rutas públicas (sin autenticación). El login lleva rate-limiting para
// mitigar fuerza bruta / credential stuffing.
router.post('/login', loginLimiter, AuthController.login);

// Recuperación de contraseña por correo (3 pasos). Los topes finos (intentos
// por código, envíos por hora) viven en MongoDB; estos limiters frenan por IP.
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  AuthController.forgotPassword
);
router.post(
  '/verify-reset-code',
  verifyResetCodeLimiter,
  AuthController.verifyResetCode
);
router.post(
  '/reset-password',
  resetPasswordLimiter,
  AuthController.resetPassword
);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, AuthController.getProfile);
router.post('/logout', authenticateToken, AuthController.logout);

// Ruta de prueba de email (solo admin)
router.post('/test-email', authenticateToken, AuthController.testEmail);

export default router;
