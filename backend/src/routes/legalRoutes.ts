import { Router } from 'express';
import { LegalController } from '../controllers/legalController';

const router = Router();

// Rutas públicas: la política de privacidad debe poder consultarse en cualquier
// momento y sin autenticación (Ley 1581/2012).
router.get('/privacy-policy', LegalController.getPrivacyPolicy);
router.get('/privacy-policy/:version', LegalController.getPrivacyPolicy);

export default router;
