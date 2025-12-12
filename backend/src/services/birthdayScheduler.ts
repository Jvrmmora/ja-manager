import cron from 'node-cron';
import Young from '../models/Young';
import Season from '../models/Season';
import { JWTService } from './jwtService';
import { emailService } from './emailService';
import logger from '../utils/logger';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';

/**
 * Envía correos de cumpleaños a todos los jóvenes que cumplen años hoy
 */
export async function sendDailyBirthdayEmails(): Promise<void> {
  try {
    logger.info('Iniciando envío automático de correos de cumpleaños', {
      context: 'BirthdayScheduler',
      method: 'sendDailyBirthdayEmails',
    });

    const today = getCurrentDateTimeColombia();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();

    // Buscar jóvenes que cumplen años hoy
    const allYoung = await Young.find({
      birthday: { $exists: true, $ne: null },
      email: { $exists: true, $ne: null, $nin: ['', null] },
    });

    // Filtrar por cumpleaños de hoy
    const birthdayYoung = allYoung.filter(young => {
      if (!young.birthday) return false;

      const birthDate = new Date(young.birthday);
      const birthMonth = birthDate.getMonth();
      const birthDay = birthDate.getDate();

      // Verificar que sea el mismo mes y día
      if (birthMonth !== currentMonth || birthDay !== currentDay) {
        return false;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!young.email || !emailRegex.test(young.email)) {
        return false;
      }

      // Verificar que no haya reclamado este año
      if (young.birthdayPointsClaimed) {
        const claimedYear = new Date(young.birthdayPointsClaimed).getFullYear();
        if (claimedYear === currentYear) {
          return false; // Ya reclamó este año
        }
      }

      return true;
    });

    if (birthdayYoung.length === 0) {
      logger.info('No hay cumpleaños hoy o todos ya reclamaron', {
        context: 'BirthdayScheduler',
        method: 'sendDailyBirthdayEmails',
        date: today.toISOString(),
      });
      return;
    }

    // Obtener temporada activa para puntos configurados
    const activeSeason = await Season.findOne({ status: 'ACTIVE' });
    const birthdayPoints = activeSeason?.settings?.birthdayBonusPoints || 100;

    // Enviar correos
    let successCount = 0;
    let errorCount = 0;

    for (const young of birthdayYoung) {
      try {
        // Generar token de cumpleaños
        const birthdayToken = JWTService.generateBirthdayToken(
          (young._id as any).toString(),
          young.email!
        );

        // Enviar email
        await emailService.sendEmail({
          toEmail: young.email!,
          toName: young.fullName,
          message: '',
          type: 'birthday',
          birthdayToken,
          birthdayPoints,
        });

        successCount++;

        logger.info('Correo de cumpleaños enviado', {
          context: 'BirthdayScheduler',
          method: 'sendDailyBirthdayEmails',
          youngId: (young._id as any).toString(),
          youngName: young.fullName,
          email: young.email,
        });
      } catch (error) {
        errorCount++;

        logger.error('Error enviando correo de cumpleaños', {
          context: 'BirthdayScheduler',
          method: 'sendDailyBirthdayEmails',
          youngId: (young._id as any).toString(),
          youngName: young.fullName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info('Envío automático de correos de cumpleaños completado', {
      context: 'BirthdayScheduler',
      method: 'sendDailyBirthdayEmails',
      total: birthdayYoung.length,
      success: successCount,
      errors: errorCount,
      date: today.toISOString(),
    });
  } catch (error) {
    logger.error('Error en el proceso de envío de correos de cumpleaños', {
      context: 'BirthdayScheduler',
      method: 'sendDailyBirthdayEmails',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Inicia el scheduler de cumpleaños
 * Corre todos los días a las 12:00 AM (medianoche) en zona horaria de Colombia
 */
export function startBirthdayScheduler(): void {
  // Obtener schedule desde variable de entorno o usar default
  const cronSchedule = process.env.BIRTHDAY_CRON_SCHEDULE || '0 0 * * *';

  // Configurar cron job
  cron.schedule(
    cronSchedule,
    async () => {
      logger.info('Ejecutando tarea programada de cumpleaños', {
        context: 'BirthdayScheduler',
        method: 'startBirthdayScheduler',
        schedule: cronSchedule,
      });

      await sendDailyBirthdayEmails();
    },
    {
      timezone: 'America/Bogota',
    }
  );

  logger.info('Scheduler de cumpleaños iniciado correctamente', {
    context: 'BirthdayScheduler',
    method: 'startBirthdayScheduler',
    schedule: cronSchedule,
    timezone: 'America/Bogota',
    description:
      'Envío automático de correos de cumpleaños diarios a medianoche',
  });
}
