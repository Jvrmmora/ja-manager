import { Request } from 'express';
import mongoose from 'mongoose';
import ConsentRecord, {
  ConsentChannel,
  IConsentGuardian,
} from '../models/ConsentRecord';
import Young from '../models/Young';
import {
  CURRENT_POLICY_VERSION,
  getCurrentPolicyHash,
} from '../config/privacyPolicy';
import { getClientIp } from '../middleware/rateLimiter';
import { getCurrentDateTimeColombia } from '../utils/dateUtils';
import logger from '../utils/logger';

interface YoungLike {
  dataConsent?: {
    status?: string;
    version?: string | null;
  } | null;
}

/**
 * Indica si el usuario necesita aceptar (o volver a aceptar) la política vigente.
 */
export function needsConsent(young: YoungLike | null | undefined): boolean {
  if (!young) return false;
  return young.dataConsent?.version !== CURRENT_POLICY_VERSION;
}

/**
 * Devuelve el estado de consentimiento del usuario respecto de la versión vigente.
 */
export function resolveConsentStatus(
  young: YoungLike | null | undefined
): 'none' | 'current' | 'pending_reconsent' {
  if (!young) return 'none';
  const version = young.dataConsent?.version;
  if (version === CURRENT_POLICY_VERSION) return 'current';
  if (version) return 'pending_reconsent';
  return 'none';
}

interface RecordConsentParams {
  youngId: mongoose.Types.ObjectId | string;
  channel: ConsentChannel;
  req?: Request;
  isMinor?: boolean;
  guardian?: IConsentGuardian;
  /** Fecha explícita (por defecto, ahora en zona horaria de Colombia). */
  acceptedAt?: Date;
}

/**
 * Registra la evidencia del consentimiento y actualiza el resumen en Young.
 * Es idempotente en el sentido de que crear varios registros para el mismo
 * usuario/versión es válido y esperado (append-only).
 */
export async function recordConsent(
  params: RecordConsentParams
): Promise<void> {
  const {
    youngId,
    channel,
    req,
    isMinor = false,
    guardian,
    acceptedAt = getCurrentDateTimeColombia(),
  } = params;

  const record = await ConsentRecord.create({
    young_id: youngId,
    policyVersion: CURRENT_POLICY_VERSION,
    policyHash: getCurrentPolicyHash(),
    documents: ['privacy_policy', 'data_processing_authorization'],
    acceptedAt,
    ip: req ? getClientIp(req) : undefined,
    userAgent: req
      ? String(req.headers['user-agent'] || '').slice(0, 500)
      : undefined,
    channel,
    isMinor,
    guardian:
      guardian && (guardian.fullName || guardian.relationship)
        ? guardian
        : undefined,
  });

  await Young.findByIdAndUpdate(
    youngId,
    {
      $set: {
        'dataConsent.status': 'current',
        'dataConsent.version': CURRENT_POLICY_VERSION,
        'dataConsent.acceptedAt': acceptedAt,
        'dataConsent.lastRecordId': record._id,
      },
    },
    { runValidators: false }
  );

  logger.info('Consentimiento de datos personales registrado', {
    context: 'consentService',
    method: 'recordConsent',
    youngId: youngId.toString(),
    policyVersion: CURRENT_POLICY_VERSION,
    channel,
    isMinor,
  });
}
