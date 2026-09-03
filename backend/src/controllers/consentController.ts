import { Request, Response } from 'express';
import Young from '../models/Young';
import ConsentRecord from '../models/ConsentRecord';
import { IAuthUser, ApiResponse } from '../types';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../utils/errorHandler';
import { consentAcceptSchema } from '../utils/validation';
import {
  CURRENT_POLICY_VERSION,
  POLICY_EFFECTIVE_DATE,
  PRIVACY_CONTACT_EMAIL,
} from '../config/privacyPolicy';
import { recordConsent, resolveConsentStatus } from '../services/consentService';
import logger from '../utils/logger';

function calculateAge(birthday?: Date | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  if (Number.isNaN(birthDate.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export class ConsentController {
  /**
   * Estado e historial de consentimiento del usuario autenticado.
   */
  static getMyConsent = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = req.user as IAuthUser;

      const young = await Young.findById(authUser.userId).select(
        'dataConsent birthday'
      );
      if (!young) {
        throw new NotFoundError('Usuario');
      }

      const history = await ConsentRecord.find({ young_id: authUser.userId })
        .sort({ acceptedAt: -1 })
        .limit(20)
        .lean();

      const status = resolveConsentStatus(young);

      res.status(200).json({
        success: true,
        message: 'Estado de consentimiento obtenido exitosamente',
        data: {
          status,
          requiresConsent: status !== 'current',
          currentVersion: CURRENT_POLICY_VERSION,
          effectiveDate: POLICY_EFFECTIVE_DATE,
          contactEmail: PRIVACY_CONTACT_EMAIL,
          acceptedVersion: young.dataConsent?.version || null,
          acceptedAt: young.dataConsent?.acceptedAt || null,
          history: history.map(h => ({
            id: (h._id as any).toString(),
            policyVersion: h.policyVersion,
            acceptedAt: h.acceptedAt,
            channel: h.channel,
            isMinor: h.isMinor,
          })),
        },
      } as ApiResponse);
    }
  );

  /**
   * El usuario autenticado acepta la versión vigente de la política.
   */
  static acceptConsent = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = req.user as IAuthUser;

      const { error, value } = consentAcceptSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      if (value.policyVersion !== CURRENT_POLICY_VERSION) {
        throw new ValidationError(
          'La versión de la política no es la vigente. Recarga la página e inténtalo de nuevo.'
        );
      }

      const young = await Young.findById(authUser.userId).select(
        'dataConsent birthday'
      );
      if (!young) {
        throw new NotFoundError('Usuario');
      }

      const age = calculateAge(young.birthday as Date | undefined);
      const isMinor = age !== null && age < 18;

      // Si es menor, exigimos al menos el nombre del representante legal.
      if (isMinor && !value.guardianFullName) {
        throw new ValidationError(
          'Para usuarios menores de edad se requiere la autorización del padre, madre o representante legal.'
        );
      }

      const hadPreviousVersion = Boolean(young.dataConsent?.version);

      await recordConsent({
        youngId: authUser.userId,
        channel: hadPreviousVersion ? 'reconsent' : 'login_gate',
        req,
        isMinor,
        guardian: isMinor
          ? {
              fullName: value.guardianFullName || undefined,
              relationship: value.guardianRelationship || undefined,
            }
          : undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Consentimiento registrado exitosamente',
        data: {
          status: 'current',
          requiresConsent: false,
          currentVersion: CURRENT_POLICY_VERSION,
        },
      } as ApiResponse);
    }
  );

  /**
   * El usuario decide no aceptar. No se elimina nada automáticamente: se cierra
   * la sesión en el cliente y se indica el canal para solicitar la supresión.
   */
  static declineConsent = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = req.user as IAuthUser;

      logger.warn('Usuario rechazó el consentimiento de datos personales', {
        context: 'ConsentController',
        method: 'declineConsent',
        youngId: authUser.userId,
        policyVersion: CURRENT_POLICY_VERSION,
      });

      res.status(200).json({
        success: true,
        message:
          'Registramos que no autorizas el tratamiento de tus datos. Para solicitar la eliminación de tu información, escríbenos al correo de contacto.',
        data: {
          contactEmail: PRIVACY_CONTACT_EMAIL,
        },
      } as ApiResponse);
    }
  );
}
