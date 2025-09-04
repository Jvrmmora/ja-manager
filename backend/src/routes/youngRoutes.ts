import { Router } from 'express';
import { YoungController } from '../controllers/youngController';
import { upload, handleMulterError } from '../middleware/upload';
import { authenticateAndAuthorize } from '../middleware/auth';

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

// Rutas para jóvenes (todas protegidas con autenticación y autorización)
router.get('/', ...authenticateAndAuthorize('young:read'), YoungController.getAllYoung);
router.get('/stats', ...authenticateAndAuthorize('young:stats'), YoungController.getStats);
router.get('/:id', ...authenticateAndAuthorize('young:read'), YoungController.getYoungById);
router.post('/', ...authenticateAndAuthorize('young:create'), upload.single('profileImage'), handleMulterError, parseFormData, YoungController.createYoung);
router.put('/:id', ...authenticateAndAuthorize('young:update'), upload.single('profileImage'), handleMulterError, parseFormData, YoungController.updateYoung);
router.put('/:id/generate-placa', ...authenticateAndAuthorize('placa:generate'), YoungController.generatePlaca);
router.delete('/:id', ...authenticateAndAuthorize('young:delete'), YoungController.deleteYoung);

export default router;
