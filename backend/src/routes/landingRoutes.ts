import { Router } from 'express';
import {
  getLandingContent,
  getAdminLandingContent,
  updateLandingContent,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  createMedia,
  updateMedia,
  deleteMedia,
  uploadMediaFile,
  trackLandingVisit,
  getLandingVisitMetrics,
} from '../controllers/landingController';
import { authenticateAndAuthorize } from '../middleware/auth';
import { landingVisitLimiter } from '../middleware/rateLimiter';
import {
  landingUpload,
  handleLandingMulterError,
} from '../middleware/landingUpload';

const router = Router();

// Todas las rutas admin requieren el scope 'landing:manage'. El rol
// "Super Admin" lo recibe automáticamente en cada arranque (DatabaseSeeder);
// cualquier otro rol necesita que se le añada explícitamente.
const requireLandingManage = authenticateAndAuthorize('landing:manage');

/**
 * GET /api/landing
 * Obtener contenido público de landing
 */
router.get('/', getLandingContent);

/**
 * POST /api/landing/metrics/visit
 * Registrar visita única anual para analítica pública
 */
router.post('/metrics/visit', landingVisitLimiter, trackLandingVisit);

/**
 * GET /api/landing/metrics/visit
 * Obtener total de visitantes únicos del año en curso (contador público)
 */
router.get('/metrics/visit', getLandingVisitMetrics);

// ==========================================
// RUTAS ADMIN (requieren scope 'landing:manage')
// ==========================================

/**
 * GET /api/admin/landing
 * Obtener todo el contenido (admin view)
 */
router.get('/admin/content', requireLandingManage, getAdminLandingContent);

/**
 * PUT /api/admin/landing/content
 * Actualizar contenido general
 */
router.put('/admin/content', requireLandingManage, updateLandingContent);

// ==========================================
// REUNIONES SEMANALES
// ==========================================

/**
 * POST /api/admin/landing/meetings
 * Crear reunión
 */
router.post('/admin/meetings', requireLandingManage, createMeeting);

/**
 * PUT /api/admin/landing/meetings/:id
 * Actualizar reunión
 */
router.put('/admin/meetings/:id', requireLandingManage, updateMeeting);

/**
 * DELETE /api/admin/landing/meetings/:id
 * Eliminar reunión
 */
router.delete('/admin/meetings/:id', requireLandingManage, deleteMeeting);

// ==========================================
// MEDIA / IMÁGENES
// ==========================================

/**
 * POST /api/admin/landing/media
 * Crear referencia de media
 */
router.post('/admin/media', requireLandingManage, createMedia);

/**
 * PUT /api/admin/landing/media/:id
 * Actualizar media
 */
router.put('/admin/media/:id', requireLandingManage, updateMedia);

/**
 * DELETE /api/admin/landing/media/:id
 * Eliminar media
 */
router.delete('/admin/media/:id', requireLandingManage, deleteMedia);

/**
 * POST /api/admin/landing/media/upload
 * Subir archivo de media para la landing
 */
router.post(
  '/admin/media/upload',
  ...requireLandingManage,
  landingUpload.single('file'),
  handleLandingMulterError,
  uploadMediaFile
);

export default router;
