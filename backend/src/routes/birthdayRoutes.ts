import { Router, Request, Response } from 'express';
import { authenticateAndAuthorize as authenticate } from '../middleware/auth';
import { birthdayClaimLimiter } from '../middleware/rateLimiter';
import { JWTService } from '../services/jwtService';
import { pointsService } from '../services/pointsService';
import { emailService } from '../services/emailService';
import Young from '../models/Young';
import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import logger from '../utils/logger';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';

const router = Router();

/**
 * POST /api/birthday/send-email/:youngId
 * Enviar correo de cumpleaños manualmente a un joven
 * Requiere autenticación y permisos de lectura de jóvenes
 */
router.post(
  '/send-email/:youngId',
  authenticate(['young:read'] as any),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { youngId } = req.params;

      // Obtener el joven
      const young = await Young.findById(youngId);
      if (!young) {
        res.status(404).json({
          success: false,
          message: 'Joven no encontrado',
        });
        return;
      }

      // Validar que tenga email
      if (!young.email || !young.email.trim()) {
        res.status(400).json({
          success: false,
          message: 'El joven no tiene email registrado',
        });
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(young.email)) {
        res.status(400).json({
          success: false,
          message: 'El email del joven no es válido',
        });
        return;
      }

      // Validar que tenga fecha de cumpleaños
      if (!young.birthday) {
        res.status(400).json({
          success: false,
          message: 'El joven no tiene fecha de cumpleaños registrada',
        });
        return;
      }

      // Validar que sea su mes de cumpleaños
      const today = getCurrentDateTimeColombia();
      const birthDate = new Date(young.birthday);
      const isCurrentMonth = today.getMonth() === birthDate.getMonth();

      if (!isCurrentMonth) {
        res.status(400).json({
          success: false,
          message: 'No es el mes de cumpleaños del joven',
        });
        return;
      }

      // Obtener temporada activa para puntos configurados
      const activeSeason = await Season.findOne({ status: 'ACTIVE' });
      const birthdayPoints = activeSeason?.settings?.birthdayBonusPoints || 100;

      // Generar token de cumpleaños
      const birthdayToken = JWTService.generateBirthdayToken(
        (young._id as any).toString(),
        young.email
      );

      // Enviar email
      await emailService.sendEmail({
        toEmail: young.email,
        toName: young.fullName,
        message: '',
        type: 'birthday',
        birthdayToken,
        birthdayPoints,
      });

      logger.info('Correo de cumpleaños enviado manualmente', {
        context: 'BirthdayController',
        method: 'sendBirthdayEmail',
        youngId: (young._id as any).toString(),
        youngName: young.fullName,
        youngEmail: young.email,
        sentBy: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        message: `Correo de cumpleaños enviado a ${young.fullName}`,
        data: {
          youngName: young.fullName,
          email: young.email,
          points: birthdayPoints,
        },
      });
    } catch (error) {
      logger.error('Error enviando correo de cumpleaños', {
        context: 'BirthdayController',
        method: 'sendBirthdayEmail',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Error al enviar correo de cumpleaños',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

/**
 * POST /api/birthday/claim
 * Reclamar puntos de cumpleaños usando token del correo
 * Requiere autenticación (sesión iniciada) + rate limiting
 */
router.post(
  '/claim',
  authenticate([] as any), // Requiere estar logueado
  birthdayClaimLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { birthdayToken } = req.body;

      if (!birthdayToken) {
        res.status(400).json({
          success: false,
          message: 'Token de cumpleaños no proporcionado',
        });
        return;
      }

      // Verificar token de cumpleaños
      const tokenData = JWTService.verifyBirthdayToken(birthdayToken);
      if (!tokenData) {
        res.status(401).json({
          success: false,
          message: 'Token de cumpleaños inválido o expirado',
        });
        return;
      }

      // Obtener ID del usuario de la sesión
      const sessionYoungId = req.user?.userId;
      if (!sessionYoungId) {
        res.status(401).json({
          success: false,
          message: 'Sesión inválida',
        });
        return;
      }

      // Verificar que el token pertenece al usuario logueado
      if (tokenData.youngId !== sessionYoungId) {
        logger.warn('Intento de reclamar puntos con token de otro usuario', {
          context: 'BirthdayController',
          method: 'claimBirthdayPoints',
          sessionYoungId,
          tokenYoungId: tokenData.youngId,
        });

        res.status(403).json({
          success: false,
          message: 'Este regalo no es para ti',
        });
        return;
      }

      // Reclamar puntos usando el servicio
      const result = await pointsService.claimBirthdayPoints(sessionYoungId);

      logger.info('Puntos de cumpleaños reclamados exitosamente', {
        context: 'BirthdayController',
        method: 'claimBirthdayPoints',
        youngId: sessionYoungId,
        youngName: result.youngName,
        points: result.points,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          points: result.points,
          youngName: result.youngName,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error('Error reclamando puntos de cumpleaños', {
        context: 'BirthdayController',
        method: 'claimBirthdayPoints',
        error: errorMessage,
        youngId: req.user?.userId,
      });

      // Manejar errores específicos
      if (
        errorMessage.includes('Ya reclamaste') ||
        errorMessage.includes('ventana de reclamación')
      ) {
        res.status(400).json({
          success: false,
          message: errorMessage,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Error al reclamar puntos de cumpleaños',
        error: errorMessage,
      });
    }
  }
);

/**
 * GET /api/birthday/stats
 * Obtener estadísticas de cumpleaños
 * Requiere autenticación y permisos de lectura de jóvenes
 */
router.get(
  '/stats',
  authenticate(['young:read'] as any),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const today = getCurrentDateTimeColombia();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Contar correos enviados hoy (basado en birthdayPointsClaimed de hoy)
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const emailsSentToday = await Young.countDocuments({
        birthday: { $exists: true },
        birthdayPointsClaimed: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      // Contar puntos reclamados este mes
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(
        currentYear,
        currentMonth + 1,
        0,
        23,
        59,
        59,
        999
      );

      const birthdayTransactionsThisMonth = await PointsTransaction.find({
        type: 'BIRTHDAY',
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

      const totalPointsClaimedThisMonth = birthdayTransactionsThisMonth.reduce(
        (sum, transaction) => sum + transaction.points,
        0
      );

      // Obtener próximos 10 cumpleaños
      const allYoung = await Young.find({
        birthday: { $exists: true, $ne: null },
      }).select('fullName birthday profileImage');

      // Calcular próximos cumpleaños
      const upcomingBirthdays = allYoung
        .map(young => {
          const birthDate = new Date(young.birthday!);
          const nextBirthday = new Date(
            currentYear,
            birthDate.getMonth(),
            birthDate.getDate()
          );

          // Si ya pasó este año, usar el próximo año
          if (nextBirthday < today) {
            nextBirthday.setFullYear(currentYear + 1);
          }

          const daysUntil = Math.ceil(
            (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            youngId: (young._id as any).toString(),
            fullName: young.fullName,
            birthday: young.birthday,
            nextBirthday,
            daysUntil,
            profileImage: young.profileImage,
          };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          emailsSentToday,
          totalPointsClaimedThisMonth,
          transactionsCount: birthdayTransactionsThisMonth.length,
          upcomingBirthdays,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo estadísticas de cumpleaños', {
        context: 'BirthdayController',
        method: 'getStats',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

export default router;
