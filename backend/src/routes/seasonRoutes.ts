import { Router } from 'express';
import {
  createSeason,
  getSeasons,
  getActiveSeason,
  getSeasonById,
  updateSeason,
  activateSeason,
  completeSeason,
  deleteSeason,
} from '../controllers/seasonController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rutas públicas (obtener temporadas y temporada activa)
router.get('/', getSeasons);
router.get('/active', getActiveSeason);
router.get('/:id', getSeasonById);

// Rutas protegidas (solo admin)
router.post('/', authenticateToken, createSeason);
router.put('/:id', authenticateToken, updateSeason);
router.post('/:id/activate', authenticateToken, activateSeason);
router.post('/:id/complete', authenticateToken, completeSeason);
router.delete('/:id', authenticateToken, deleteSeason);

export default router;
