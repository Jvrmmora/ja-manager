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
} from '../controllers/landingController';
import { authenticateToken } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

/**
 * GET /api/landing
 * Obtener contenido público de landing
 */
router.get('/', getLandingContent);

// ==========================================
// RUTAS ADMIN (requieren autenticación)
// ==========================================

/**
 * GET /api/admin/landing
 * Obtener todo el contenido (admin view)
 */
router.get(
  '/admin/content',
  authenticateToken,
  getAdminLandingContent
);

/**
 * PUT /api/admin/landing/content
 * Actualizar contenido general
 */
router.put(
  '/admin/content',
  authenticateToken,
  updateLandingContent
);

// ==========================================
// REUNIONES SEMANALES
// ==========================================

/**
 * POST /api/admin/landing/meetings
 * Crear reunión
 */
router.post(
  '/admin/meetings',
  authenticateToken,
  createMeeting
);

/**
 * PUT /api/admin/landing/meetings/:id
 * Actualizar reunión
 */
router.put(
  '/admin/meetings/:id',
  authenticateToken,
  updateMeeting
);

/**
 * DELETE /api/admin/landing/meetings/:id
 * Eliminar reunión
 */
router.delete(
  '/admin/meetings/:id',
  authenticateToken,
  deleteMeeting
);

// ==========================================
// MEDIA / IMÁGENES
// ==========================================

/**
 * POST /api/admin/landing/media
 * Crear referencia de media
 */
router.post(
  '/admin/media',
  authenticateToken,
  createMedia
);

/**
 * PUT /api/admin/landing/media/:id
 * Actualizar media
 */
router.put(
  '/admin/media/:id',
  authenticateToken,
  updateMedia
);

/**
 * DELETE /api/admin/landing/media/:id
 * Eliminar media
 */
router.delete(
  '/admin/media/:id',
  authenticateToken,
  deleteMedia
);

/**
 * POST /api/admin/landing/media/upload
 * Subir archivo a Azure Blob Storage
 */
router.post(
  '/admin/media/upload',
  authenticateToken,
  upload.single('file'),
  uploadMediaFile
);

export default router;
