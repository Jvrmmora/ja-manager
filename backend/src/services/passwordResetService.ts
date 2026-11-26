import crypto from 'crypto';
import Young from '../models/Young';
import PasswordReset from '../models/PasswordReset';
import env from '../config/env';
import logger from '../utils/logger';
import { emailService } from './emailService';
import {
  NEW_PASSWORD_REGEX,
  NEW_PASSWORD_MESSAGE,
} from '../utils/passwordPolicy';
import { AppError, ErrorType, ValidationError } from '../utils/errorHandler';

/**
 * Recuperación de contraseña por correo ("olvidé mi contraseña").
 *
 * Tres pasos, cada uno una función:
 *  1. requestPasswordReset: genera un código de 6 dígitos y lo envía por correo.
 *  2. verifyResetCode: valida el código y entrega un token de un solo uso.
 *  3. resetPassword: con ese token fija la contraseña nueva y cierra sesiones.
 *
 * Seguridad (resumen):
 *  - Respuesta genérica: nunca se revela si una cuenta existe.
 *  - El código y el token se guardan solo como HMAC (nada en claro).
 *  - Topes en MongoDB (no en memoria): 5 intentos por código, 60 s entre
 *    envíos y 3 envíos por hora por cuenta.
 *  - El código se consume al verificarlo; el token al usarlo.
 */

export const RESET_CODE_TTL_MS = 10 * 60 * 1000; // vida del código
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // vida del token del paso 3
export const RESET_MAX_ATTEMPTS = 5; // intentos fallidos por código
export const RESET_COOLDOWN_MS = 60 * 1000; // espera entre envíos
export const RESET_MAX_SENDS_PER_HOUR = 3; // códigos por hora por cuenta
const HOUR_MS = 60 * 60 * 1000;

/** Códigos de error estables para que el frontend decida qué pantalla mostrar. */
export const RESET_ERROR = {
  CODE_INVALID: 'RESET_CODE_INVALID',
  CODE_EXPIRED: 'RESET_CODE_EXPIRED',
  TOO_MANY_ATTEMPTS: 'RESET_TOO_MANY_ATTEMPTS',
  TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  PASSWORD_SAME: 'RESET_PASSWORD_SAME',
  EMAIL_UNAVAILABLE: 'EMAIL_UNAVAILABLE',
} as const;

const codeError = (message: string, code: string, extra?: object) =>
  new ValidationError(message, { code, ...extra });

const hmac = (purpose: string, value: string): string =>
  crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`pwreset:${purpose}:${value}`)
    .digest('hex');

export const hashCode = (youngId: string, code: string): string =>
  hmac('code', `${youngId}:${code}`);
export const hashToken = (token: string): string => hmac('token', token);

const safeEqualHex = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

const generateCode = (): string =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

/**
 * Busca la cuenta por correo o placa (igual que el login) y exige que pueda
 * recibir el correo: con contraseña, con email, sin borrar, sin spam.
 */
const findEligibleYoung = async (identifier: string) => {
  const id = (identifier || '').trim();
  if (!id || id.length > 120) return null;

  const young = await Young.findOne({
    $or: [{ email: id.toLowerCase() }, { placa: id.toUpperCase() }],
    deletedAt: null,
    isSpam: { $ne: true },
    mergedInto: null,
  });

  if (!young || !young.password || !young.email) return null;
  return young;
};

export interface RequestResetResult {
  /** true si se generó un código y se disparó el correo */
  queued: boolean;
  /** Promesa del envío (el controlador no la espera; los tests sí). */
  delivery: Promise<void>;
}

const skipped = (reason: string): RequestResetResult => {
  logger.info('Recuperación de contraseña: solicitud omitida', {
    context: 'PasswordReset',
    method: 'requestPasswordReset',
    reason,
  });
  return { queued: false, delivery: Promise.resolve() };
};

/**
 * Paso 1. Siempre "tiene éxito" hacia afuera; si la cuenta no es elegible o se
 * superó un tope, no hace nada y el controlador responde igual.
 */
export const requestPasswordReset = async (
  identifier: string,
  ip?: string
): Promise<RequestResetResult> => {
  if (!emailService.isConfigured()) {
    throw new AppError(
      'El envío de correos no está disponible en este momento. Intenta más tarde o pide ayuda a un administrador.',
      ErrorType.INTERNAL,
      503,
      true,
      { code: RESET_ERROR.EMAIL_UNAVAILABLE }
    );
  }

  const young = await findEligibleYoung(identifier);
  if (!young) return skipped('cuenta no elegible');

  const youngId = String(young._id);
  const now = new Date();
  const code = generateCode();
  const base = {
    codeHash: hashCode(youngId, code),
    attempts: 0,
    lastSentAt: now,
    codeExpiresAt: new Date(now.getTime() + RESET_CODE_TTL_MS),
    expiresAt: new Date(now.getTime() + HOUR_MS),
    requestIp: ip,
  };

  const existing = await PasswordReset.findOne({ youngId: young._id });

  if (!existing) {
    try {
      await PasswordReset.create({
        youngId: young._id,
        ...base,
        sentCount: 1,
        windowStartedAt: now,
      });
    } catch (error: any) {
      if (error?.code === 11000) return skipped('solicitud simultánea');
      throw error;
    }
  } else {
    if (now.getTime() - existing.lastSentAt.getTime() < RESET_COOLDOWN_MS) {
      return skipped('enfriamiento de 60 s');
    }
    const inWindow =
      now.getTime() - existing.windowStartedAt.getTime() < HOUR_MS;
    if (inWindow && existing.sentCount >= RESET_MAX_SENDS_PER_HOUR) {
      return skipped('tope de envíos por hora');
    }

    // Condición sobre lastSentAt: si dos solicitudes llegan a la vez, solo una gana.
    const result = await PasswordReset.updateOne(
      { _id: existing._id, lastSentAt: existing.lastSentAt },
      {
        $set: {
          ...base,
          sentCount: inWindow ? existing.sentCount + 1 : 1,
          windowStartedAt: inWindow ? existing.windowStartedAt : now,
        },
        $unset: { resetTokenHash: '', resetTokenExpiresAt: '', verifiedAt: '' },
      }
    );
    if (result.modifiedCount === 0) return skipped('solicitud simultánea');
  }

  const delivery = emailService
    .sendEmailOrThrow({
      toEmail: young.email,
      toName: young.fullName,
      message: `Tu código de verificación es ${code}. Vence en 10 minutos.`,
      type: 'password_reset',
      resetCode: code,
      expiresInMinutes: RESET_CODE_TTL_MS / 60000,
    })
    .catch(async (error: unknown) => {
      logger.error('No se pudo enviar el código de recuperación', {
        context: 'PasswordReset',
        method: 'requestPasswordReset',
        youngId,
        error: error instanceof Error ? error.message : String(error),
      });
      // El código no llegó: se invalida para no dejar uno que nadie recibió.
      await PasswordReset.updateOne(
        { youngId: young._id, codeHash: base.codeHash },
        { $set: { codeExpiresAt: new Date(0) } }
      ).catch(() => undefined);
    });

  return { queued: true, delivery };
};

/**
 * Paso 2. Valida el código (máximo 5 intentos) y devuelve el token del paso 3.
 */
export const verifyResetCode = async (
  identifier: string,
  code: string
): Promise<{ resetToken: string; expiresInSeconds: number }> => {
  const invalid = () =>
    codeError(
      'El código no es válido o ya venció. Pide uno nuevo.',
      RESET_ERROR.CODE_INVALID
    );

  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    throw codeError('El código debe tener 6 dígitos.', RESET_ERROR.CODE_INVALID);
  }

  const young = await findEligibleYoung(identifier);
  if (!young) throw invalid();
  const youngId = String(young._id);

  const now = new Date();
  const doc = await PasswordReset.findOne({ youngId: young._id });
  if (!doc || doc.resetTokenHash || doc.codeExpiresAt.getTime() <= now.getTime()) {
    throw codeError(
      'El código venció. Pide uno nuevo.',
      RESET_ERROR.CODE_EXPIRED
    );
  }

  // El intento se cuenta ANTES de comparar: así dos peticiones en paralelo no
  // pueden adivinar más veces del tope.
  const counted = await PasswordReset.findOneAndUpdate(
    {
      _id: doc._id,
      attempts: { $lt: RESET_MAX_ATTEMPTS },
      resetTokenHash: { $exists: false },
    },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!counted) {
    throw codeError(
      'Superaste el máximo de intentos. Pide un código nuevo.',
      RESET_ERROR.TOO_MANY_ATTEMPTS
    );
  }

  if (!safeEqualHex(counted.codeHash, hashCode(youngId, code.trim()))) {
    const remaining = RESET_MAX_ATTEMPTS - counted.attempts;
    if (remaining <= 0) {
      await PasswordReset.updateOne(
        { _id: counted._id },
        { $set: { codeExpiresAt: new Date(0) } }
      );
      throw codeError(
        'Superaste el máximo de intentos. Pide un código nuevo.',
        RESET_ERROR.TOO_MANY_ATTEMPTS
      );
    }
    throw codeError(
      `Código incorrecto. Te quedan ${remaining} ${remaining === 1 ? 'intento' : 'intentos'}.`,
      RESET_ERROR.CODE_INVALID,
      { attemptsLeft: remaining }
    );
  }

  // Código correcto: se consume (se reemplaza su hash) y se emite el token.
  const resetToken = crypto.randomBytes(32).toString('hex');
  const claimed = await PasswordReset.findOneAndUpdate(
    { _id: counted._id, resetTokenHash: { $exists: false } },
    {
      $set: {
        resetTokenHash: hashToken(resetToken),
        resetTokenExpiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
        verifiedAt: now,
        codeHash: crypto.randomBytes(32).toString('hex'),
        attempts: 0,
      },
    },
    { new: true }
  );
  if (!claimed) throw invalid();

  return { resetToken, expiresInSeconds: RESET_TOKEN_TTL_MS / 1000 };
};

/**
 * Paso 3. Fija la contraseña nueva, cierra las sesiones anteriores
 * (`passwordChangedAt`) y avisa por correo.
 */
export const resetPassword = async (
  resetToken: string,
  newPassword: string
): Promise<void> => {
  const tokenError = () =>
    codeError(
      'La verificación venció. Empieza de nuevo para recibir otro código.',
      RESET_ERROR.TOKEN_INVALID
    );

  if (typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken)) {
    throw tokenError();
  }
  if (typeof newPassword !== 'string' || !NEW_PASSWORD_REGEX.test(newPassword)) {
    // Antes de consumir el token: así la persona puede corregir y reintentar.
    throw new ValidationError(NEW_PASSWORD_MESSAGE);
  }

  const tokenHash = hashToken(resetToken);
  const doc = await PasswordReset.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() },
  });
  if (!doc) throw tokenError();

  const young = await Young.findOne({
    _id: doc.youngId,
    deletedAt: null,
    isSpam: { $ne: true },
  });
  if (!young || !young.password || !young.email) {
    await PasswordReset.deleteOne({ _id: doc._id });
    throw tokenError();
  }

  if (await young.comparePassword(newPassword)) {
    throw codeError(
      'La nueva contraseña no puede ser igual a la actual.',
      RESET_ERROR.PASSWORD_SAME
    );
  }

  // El token se consume de forma atómica: solo una petición llega hasta aquí.
  const consumed = await PasswordReset.findOneAndDelete({
    _id: doc._id,
    resetTokenHash: tokenHash,
  });
  if (!consumed) throw tokenError();

  // La asignación pasa por save(): el hook pre('save') la hashea (bcrypt 12).
  // validateModifiedOnly evita que datos viejos incompletos del joven (otros
  // campos) impidan cambiar la contraseña.
  const changedAt = new Date();
  young.password = newPassword;
  young.first_login = false;
  young.passwordChangedAt = changedAt;
  await young.save({ validateModifiedOnly: true });

  logger.info('Contraseña restablecida por correo', {
    context: 'PasswordReset',
    method: 'resetPassword',
    youngId: String(young._id),
  });

  // Aviso de seguridad; sendEmail nunca lanza.
  void emailService.sendEmail({
    toEmail: young.email,
    toName: young.fullName,
    message: 'Tu contraseña fue cambiada.',
    type: 'password_changed',
    placa: young.placa,
    changedAt: changedAt.toISOString(),
  });
};
