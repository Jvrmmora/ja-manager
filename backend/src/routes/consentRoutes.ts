import { Router } from 'express';
import { ConsentController } from '../controllers/consentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas requieren autenticación: son acciones del propio titular sobre su
// consentimiento. No requieren un scope adicional.
router.get('/me', authenticateToken, ConsentController.getMyConsent);
router.post('/accept', authenticateToken, ConsentController.acceptConsent);
router.post('/decline', authenticateToken, ConsentController.declineConsent);

export default router;
