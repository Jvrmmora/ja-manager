import { Router, Request, Response } from 'express';
import { authenticateAndAuthorize as authenticate } from '../middleware/auth';
import { birthdayClaimLimiter } from '../middleware/rateLimiter';
import { requireCronSecret } from '../middleware/cronAuth';
import { JWTService } from '../services/jwtService';
import { pointsService } from '../services/pointsService';
import {
  sendPendingBirthdayCards,
  sendBirthdayCardPreview,
} from '../services/birthdayEmailService';
import { emailService } from '../services/emailService';
import Young from '../models/Young';
import PointsTransaction from '../models/PointsTransaction';
import logger from '../utils/logger';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';

const router = Router();

/**
 * POST /api/birthday/auto-assign
 * Asigna automáticamente puntos de cumpleaños a los jóvenes de grupo 1
 * que cumplen años hoy y luego les envía la tarjeta por correo (a quienes
 * tengan email). Disparado por un cron externo (GitHub Actions) dos veces
 * al día; ambos pasos son idempotentes, así que repetirlo es seguro.
 * No requiere JWT de usuario, se autentica vía header x-cron-secret.
 */
router.post(
  '/auto-assign',
  requireCronSecret,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const points = await pointsService.assignBirthdayPointsForGroupOne();

      logger.info('Asignación automática de puntos de cumpleaños ejecutada', {
        context: 'BirthdayController',
        method: 'autoAssignBirthdayPoints',
        ...points,
      });

      // Los correos van después de los puntos: si fallan, los puntos ya
      // quedaron cargados y la siguiente corrida reintenta solo el envío.
      const emails = await sendPendingBirthdayCards();

      res.status(200).json({
        success: true,
        data: { points, emails },
      });
    } catch (error) {
      logger.error('Error en asignación automática de puntos de cumpleaños', {
        context: 'BirthdayController',
        method: 'autoAssignBirthdayPoints',
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        message: 'Error al asignar puntos de cumpleaños automáticamente',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
);

/**
 * POST /api/birthday/test-card
 * Envía la tarjeta de cumpleaños con datos de ejemplo al correo del admin
 * logueado (o al `toEmail` del body) para validar Gmail y el diseño.
 */
router.post(
  '/test-card',
  authenticate('email:test'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionYoungId = req.user?.userId;
      const admin = sessionYoungId ? await Young.findById(sessionYoungId) : null;
      const toEmail: string | undefined = req.body?.toEmail || admin?.email || undefined;

      if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        res.status(400).json({
          success: false,
          message: 'Indica un correo válido en "toEmail" o registra un email en tu perfil',
        });
        return;
      }

      if (!emailService.isConfigured()) {
        res.status(503).json({
          success: false,
          message: 'El servicio de email no está configurado (GMAIL_USER / GMAIL_APP_PASSWORD)',
        });
        return;
      }

      await sendBirthdayCardPreview(
        toEmail,
        admin?.fullName || 'Joven de prueba',
        admin?.placa || '@MODEJEM001',
        admin?.profileImage
      );

      res.status(200).json({
        success: true,
        message: `Tarjeta de prueba enviada a ${toEmail}`,
        data: { toEmail, provider: emailService.getProviderName() },
      });
    } catch (error) {
      logger.error('Error enviando tarjeta de cumpleaños de prueba', {
        context: 'BirthdayController',
        method: 'testBirthdayCard',
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        success: false,
        message: 'Error al enviar la tarjeta de prueba',
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
        // 400 y no 401: la sesión es válida, solo el token de cumpleaños no
        // (un 401 haría que el frontend cierre la sesión del usuario).
        res.status(400).json({
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

      // Contar puntos de cumpleaños asignados hoy (basado en birthdayPointsClaimed de hoy)
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const birthdayPointsAssignedToday = await Young.countDocuments({
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
          birthdayPointsAssignedToday,
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
