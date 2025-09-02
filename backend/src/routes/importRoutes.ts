import express from 'express';
import { importYoungFromExcel, downloadImportTemplate } from '../controllers/importController';
import { exportYoungsToExcel } from '../controllers/importController';
import { uploadExcel } from '../middleware/uploadExcel';
import { authenticateAndAuthorize } from '../middleware/auth';

const router = express.Router();

// Rutas protegidas con autenticación y autorización
router.post('/import', ...authenticateAndAuthorize('import:create'), uploadExcel.single('file'), importYoungFromExcel);
router.get('/template', ...authenticateAndAuthorize('import:read'), downloadImportTemplate);
router.get('/export', ...authenticateAndAuthorize('import:read'), exportYoungsToExcel);

export default router;
