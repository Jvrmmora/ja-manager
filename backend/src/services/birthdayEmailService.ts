import env from '../config/env';
import Young from '../models/Young';
import Season from '../models/Season';
import { emailService } from './emailService';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';
import logger from '../utils/logger';

export interface BirthdayCardsResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: Array<{ youngId: string; message: string }>;
}

/** URL del botón "Visitar el sitio": login con la placa prellenada. */
export const buildBirthdayCtaUrl = (placa?: string | null): string =>
  placa
    ? `${env.frontendUrl}/login?placa=${encodeURIComponent(placa)}`
    : `${env.frontendUrl}/login`;

/**
 * Envía la tarjeta de cumpleaños por correo a los jóvenes de grupo 1 que
 * cumplen años hoy, tienen email y ya tienen los puntos del año cargados
 * (ver pointsService.assignBirthdayPointsForGroupOne, que corre antes).
 *
 * Idempotente: reserva `birthdayEmailSentAt` con un findOneAndUpdate atómico
 * ANTES de enviar, así ni un reintento de curl ni la segunda corrida diaria
 * del workflow pueden mandar la tarjeta dos veces. Si el envío falla, la
 * reserva se revierte para que la siguiente corrida lo reintente.
 *
 * Nunca lanza: los fallos por joven van en `failed`.
 */
export const sendPendingBirthdayCards = async (): Promise<BirthdayCardsResult> => {
  const result: BirthdayCardsResult = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: [],
  };

  if (!emailService.isConfigured()) {
    logger.warn('Servicio de email no configurado: no se envían tarjetas de cumpleaños', {
      context: 'BirthdayEmailService',
      method: 'sendPendingBirthdayCards',
    });
    return result;
  }

  const activeSeason = await Season.findOne({ status: 'ACTIVE' });
  const birthdayPoints = activeSeason?.settings?.birthdayBonusPoints || 100;

  const now = getCurrentDateTimeColombia();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const candidates = await Young.find({
    group: 1,
    email: { $nin: [null, ''] },
    birthday: { $exists: true, $ne: null },
    deletedAt: null,
    isSpam: { $ne: true },
    mergedInto: { $in: [null, undefined] },
    // Solo quien ya tiene los puntos de este año cargados
    birthdayPointsClaimed: { $gte: startOfYear },
  });

  const todaysBirthdays = candidates.filter(young => young.isBirthdayToday());
  result.processed = todaysBirthdays.length;

  for (const young of todaysBirthdays) {
    const youngId = (young._id as any).toString();
    const previousSentAt = young.birthdayEmailSentAt ?? null;

    try {
      // Reserva atómica: solo gana un intento por año.
      const reserved = await Young.findOneAndUpdate(
        {
          _id: young._id,
          $or: [
            { birthdayEmailSentAt: null },
            { birthdayEmailSentAt: { $lt: startOfYear } },
          ],
        },
        { $set: { birthdayEmailSentAt: new Date() } }
      );

      if (!reserved) {
        result.skipped++;
        continue;
      }

      try {
        await emailService.sendEmailOrThrow({
          toEmail: young.email as string,
          toName: young.fullName,
          message: `¡Feliz cumpleaños ${young.fullName}! Tienes ${birthdayPoints} puntos de regalo.`,
          type: 'birthday',
          placa: young.placa || undefined,
          profileImage: young.profileImage,
          birthdayPoints,
          birthdayCtaUrl: buildBirthdayCtaUrl(young.placa),
        });
        result.sent++;
      } catch (sendError) {
        // Liberar la reserva para que la siguiente corrida reintente.
        await Young.updateOne(
          { _id: young._id },
          { $set: { birthdayEmailSentAt: previousSentAt } }
        );
        throw sendError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed.push({ youngId, message });
      logger.error('Error enviando tarjeta de cumpleaños', {
        context: 'BirthdayEmailService',
        method: 'sendPendingBirthdayCards',
        youngId,
        error: message,
      });
    }
  }

  logger.info('Envío de tarjetas de cumpleaños finalizado', {
    context: 'BirthdayEmailService',
    method: 'sendPendingBirthdayCards',
    ...result,
    failed: result.failed.length,
  });

  return result;
};

/**
 * Envía la tarjeta con datos de ejemplo al correo indicado (para validar
 * la configuración de Gmail y el diseño sin esperar un cumpleaños real).
 */
export const sendBirthdayCardPreview = async (
  toEmail: string,
  toName: string,
  placa?: string | null,
  profileImage?: string | null
): Promise<void> => {
  const activeSeason = await Season.findOne({ status: 'ACTIVE' });
  const birthdayPoints = activeSeason?.settings?.birthdayBonusPoints || 100;

  await emailService.sendEmailOrThrow({
    toEmail,
    toName,
    message: `Tarjeta de cumpleaños de prueba para ${toName}`,
    type: 'birthday',
    placa: placa || undefined,
    profileImage,
    birthdayPoints,
    birthdayCtaUrl: buildBirthdayCtaUrl(placa),
  });
};
