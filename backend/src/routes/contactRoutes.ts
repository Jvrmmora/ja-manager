import { Router } from 'express';
import { ContactController } from '../controllers/contactController';
import { authenticateAndAuthorize } from '../middleware/auth';
import { contactFormLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', contactFormLimiter, ContactController.createContactMessage);

router.get(
  '/',
  ...authenticateAndAuthorize('contact:read'),
  ContactController.getAllContactMessages
);

router.delete(
  '/:id',
  ...authenticateAndAuthorize('contact:read'),
  ContactController.deleteContactMessage
);

router.delete(
  '/',
  ...authenticateAndAuthorize('contact:read'),
  ContactController.deleteMultipleContactMessages
);

export default router;
