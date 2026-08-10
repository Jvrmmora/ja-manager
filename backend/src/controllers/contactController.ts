import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage';
import { contactMessageSchema, contactMessagesQuerySchema } from '../utils/validation';
import { asyncHandler, ValidationError } from '../utils/errorHandler';

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return ip.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

export class ContactController {
  static createContactMessage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = contactMessageSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      // Check if email has sent a message in the last 8 days
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const recentMessage = await ContactMessage.findOne({
        email: value.email.toLowerCase(),
        createdAt: { $gte: eightDaysAgo },
      });

      if (recentMessage) {
        throw new ValidationError(
          'Ya anteriormente recibimos tu mensaje. Por favor, intenta nuevamente en 8 días.'
        );
      }

      const contactMessage = await ContactMessage.create({
        fullName: value.fullName,
        email: value.email,
        message: value.message,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent')?.slice(0, 500),
      });

      res.status(201).json({
        success: true,
        message: 'Gracias por contactarnos. Te responderemos pronto.',
        data: {
          id: contactMessage._id,
          createdAt: contactMessage.createdAt,
        },
      });
    }
  );

  static getAllContactMessages = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = contactMessagesQuerySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const page = Number(value.page || 1);
      const limit = Number(value.limit || 10);
      const skip = (page - 1) * limit;

      const [messages, totalItems] = await Promise.all([
        ContactMessage.find({})
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ContactMessage.countDocuments({}),
      ]);

      const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

      res.status(200).json({
        success: true,
        data: {
          data: messages,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      });
    }
  );

  static deleteContactMessage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      const message = await ContactMessage.findByIdAndDelete(id);

      if (!message) {
        throw new ValidationError('Mensaje no encontrado');
      }

      res.status(200).json({
        success: true,
        message: 'Mensaje eliminado correctamente',
        data: { id: message._id },
      });
    }
  );

  static deleteMultipleContactMessages = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ValidationError('Se requiere un array de IDs válido');
      }

      const result = await ContactMessage.deleteMany({ _id: { $in: ids } });

      res.status(200).json({
        success: true,
        message: `${result.deletedCount} mensaje(s) eliminado(s) correctamente`,
        data: { deletedCount: result.deletedCount },
      });
    }
  );
}
