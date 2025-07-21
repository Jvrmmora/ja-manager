import { Router } from 'express';
import { YoungController } from '../controllers/youngController';
import { upload, handleMulterError } from '../middleware/upload';

const router = Router();

// Rutas para jóvenes
router.get('/', YoungController.getAllYoung);
router.get('/stats', YoungController.getStats);
router.get('/:id', YoungController.getYoungById);
router.post('/', upload.single('profileImage'), handleMulterError, YoungController.createYoung);
router.put('/:id', upload.single('profileImage'), handleMulterError, YoungController.updateYoung);
router.delete('/:id', YoungController.deleteYoung);

export default router;
