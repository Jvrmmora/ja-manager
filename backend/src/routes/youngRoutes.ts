import { Router } from 'express';
import { YoungController } from '../controllers/youngController';
import { upload, handleMulterError } from '../middleware/upload';

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

// Rutas para jóvenes
router.get('/', YoungController.getAllYoung);
router.get('/stats', YoungController.getStats);
router.get('/:id', YoungController.getYoungById);
router.post('/', upload.single('profileImage'), handleMulterError, parseFormData, YoungController.createYoung);
router.put('/:id', upload.single('profileImage'), handleMulterError, parseFormData, YoungController.updateYoung);
router.delete('/:id', YoungController.deleteYoung);

export default router;
