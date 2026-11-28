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
  getSeasonResultsById,
  getLatestResults,
} from '../controllers/seasonController';
import {
  authenticateToken,
  authenticateAndAuthorize,
} from '../middleware/auth';

const router = Router();

// Rutas públicas (obtener temporadas y temporada activa)
router.get('/', getSeasons);
router.get('/active', getActiveSeason);

// Resultados de premiación: cualquier usuario con sesión (admin y jóvenes)
router.get('/results/latest', authenticateToken, getLatestResults);
router.get('/:id/results', authenticateToken, getSeasonResultsById);

router.get('/:id', getSeasonById);

// Rutas de escritura (solo con permiso de gestión de temporadas)
const manage = authenticateAndAuthorize('season:manage');
router.post('/', ...manage, createSeason);
router.put('/:id', ...manage, updateSeason);
router.post('/:id/activate', ...manage, activateSeason);
router.post('/:id/complete', ...manage, completeSeason);
router.delete('/:id', ...manage, deleteSeason);

export default router;
