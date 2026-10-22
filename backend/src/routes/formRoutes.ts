import { Router } from 'express';
import { FormController } from '../controllers/formController';
import { PublicFormController } from '../controllers/publicFormController';
import { authenticateAndAuthorize, optionalAuth } from '../middleware/auth';
import { formIdentifyLimiter, formSubmitLimiter } from '../middleware/rateLimiter';
import { handleMulterError, upload, verifyImageContent } from '../middleware/upload';
import { requireCronSecret } from '../middleware/cronAuth';

const router = Router();

const canRead = authenticateAndAuthorize('forms:read');
const canManage = authenticateAndAuthorize('forms:manage');

/**
 * Públicas (/f/:slug). optionalAuth: con sesión se autollenan los datos.
 */
router.get('/public/:slug', optionalAuth, PublicFormController.get);
router.post('/public/:slug/identify', formIdentifyLimiter, PublicFormController.identify);
router.post('/public/:slug/responses', formSubmitLimiter, optionalAuth, PublicFormController.submit);

/**
 * Interna: reintento de sincronización con Google Sheets (cron externo).
 */
router.post('/internal/sheets-retry', requireCronSecret, FormController.retrySheets);

/**
 * Administración
 */
router.get('/sheets/config', ...canRead, FormController.sheetsConfig);
router.get('/', ...canRead, FormController.list);
router.post('/', ...canManage, FormController.create);
router.post(
  '/cover-image',
  ...canManage,
  upload.single('file'),
  handleMulterError,
  verifyImageContent,
  FormController.uploadCover
);
router.get('/:id', ...canRead, FormController.get);
router.patch('/:id', ...canManage, FormController.update);
router.delete('/:id', ...canManage, FormController.remove);
router.post('/:id/status', ...canManage, FormController.setStatus);
router.post('/:id/duplicate', ...canManage, FormController.duplicate);

router.get('/:id/responses', ...canRead, FormController.listResponses);
router.get('/:id/stats', ...canRead, FormController.stats);
router.get('/:id/export', ...canRead, FormController.exportXlsx);
router.delete('/:id/responses/:responseId', ...canManage, FormController.deleteResponse);

router.put('/:id/sheets', ...canManage, FormController.connectSheets);
router.delete('/:id/sheets', ...canManage, FormController.disconnectSheets);
router.post('/:id/sheets/resync', ...canManage, FormController.resyncSheets);

export default router;
