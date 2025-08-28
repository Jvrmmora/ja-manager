import express from 'express';
import { importYoungFromExcel, downloadImportTemplate } from '../controllers/importController';
import { exportYoungsToExcel } from '../controllers/importController';
import { uploadExcel } from '../middleware/uploadExcel';

const router = express.Router();

// Ruta para importar jóvenes desde Excel
router.post('/import', uploadExcel.single('file'), importYoungFromExcel);

// Ruta para descargar plantilla de Excel
router.get('/template', downloadImportTemplate);

// Ruta para exportar los jóvenes actuales en Excel
router.get('/export', exportYoungsToExcel);

export default router;
