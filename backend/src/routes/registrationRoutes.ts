import { Router } from 'express';
import { RegistrationController } from '../controllers/registrationController';
import { upload, handleMulterError } from '../middleware/upload';
import {
  authenticateAndAuthorize,
  authenticateToken,
} from '../middleware/auth';
import { registrationLimiter } from '../middleware/rateLimiter';

const router = Router();

// Middleware para parsear campos JSON en FormData
const parseFormData = (req: any, res: any, next: any) => {
  if (req.body.skills && typeof req.body.skills === 'string') {
    try {
      req.body.skills = JSON.parse(req.body.skills);
    } catch (error) {
      console.error('Error parsing skills JSON:', error);
      req.body.skills = [];
    }
  }
  next();
};

// Rutas públicas para validaciones (sin autenticación)
router.get('/check-email', RegistrationController.checkEmailUnique);
router.get('/check-placa', RegistrationController.checkPlacaExists);

// Ruta pública para crear solicitud de registro (sin autenticación)
// NOTA: Ahora crea usuario Young directamente con acceso inmediato
router.post(
  '/',
  registrationLimiter, // Rate limiting: 3 por hora, 10 por día
  upload.single('profileImage'),
  handleMulterError,
  parseFormData,
  RegistrationController.createRegistrationRequest
);

// Rutas protegidas para administradores
router.get(
  '/',
  ...authenticateAndAuthorize('registration:read'),
  RegistrationController.getAllRegistrationRequests
);

router.get(
  '/:id',
  ...authenticateAndAuthorize('registration:read'),
  RegistrationController.getRegistrationRequestById
);

router.put(
  '/:id/review',
  ...authenticateAndAuthorize('registration:review'),
  RegistrationController.reviewRegistrationRequest
);

export default router;
