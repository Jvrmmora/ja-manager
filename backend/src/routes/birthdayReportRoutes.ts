import { Router } from 'express';
import { BirthdayReportController } from '../controllers/birthdayReportController';
import { authenticateAndAuthorize } from '../middleware/auth';

const router = Router();

const canRead = authenticateAndAuthorize('forms:read');
const canManage = authenticateAndAuthorize('forms:manage');

router.get('/', ...canRead, BirthdayReportController.get);
router.get('/csv', ...canRead, BirthdayReportController.csv);
router.get('/guests', ...canRead, BirthdayReportController.listGuests);
router.post('/guests', ...canManage, BirthdayReportController.createGuest);
router.delete('/guests/:id', ...canManage, BirthdayReportController.deleteGuest);

export default router;
