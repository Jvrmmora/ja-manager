import { apiRequest } from './httpClient';

/**
 * Recuperación de contraseña por correo (3 pasos). Los códigos de error son
 * los que devuelve el backend en `error.details.code`, más tres propios del
 * cliente (RATE_LIMITED, NETWORK, UNKNOWN).
 */
export type RecoveryErrorCode =
  | 'RESET_CODE_INVALID'
  | 'RESET_CODE_EXPIRED'
  | 'RESET_TOO_MANY_ATTEMPTS'
  | 'RESET_TOKEN_INVALID'
  | 'RESET_PASSWORD_SAME'
  | 'EMAIL_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN';

export class RecoveryError extends Error {
  code: RecoveryErrorCode;
  status: number;
  attemptsLeft?: number | undefined;
  retryAfterMinutes?: number | undefined;

  constructor(
    message: string,
    code: RecoveryErrorCode,
    status = 0,
    extra: { attemptsLeft?: number | undefined; retryAfterMinutes?: number | undefined } = {}
  ) {
    super(message);
    this.name = 'RecoveryError';
    this.code = code;
    this.status = status;
    this.attemptsLeft = extra.attemptsLeft;
    this.retryAfterMinutes = extra.retryAfterMinutes;
  }
}

interface ApiPayload {
  success?: boolean;
  message?: string;
  retryAfter?: number;
  data?: unknown;
  error?: {
    message?: string;
    details?: { code?: string; attemptsLeft?: number };
  };
}

const post = async <T>(endpoint: string, body: unknown): Promise<T> => {
  let response: Response;
  try {
    response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch {
    throw new RecoveryError(
      'No pudimos conectar. Revisa tu internet e inténtalo de nuevo.',
      'NETWORK'
    );
  }

  let payload: ApiPayload | null = null;
  try {
    payload = (await response.json()) as ApiPayload;
  } catch {
    // respuesta sin JSON (p. ej. un 502 del proxy): se maneja abajo
  }

  if (response.ok && payload?.success !== false) {
    return (payload?.data ?? {}) as T;
  }

  if (response.status === 429) {
    throw new RecoveryError(
      payload?.message || 'Demasiados intentos. Espera un momento.',
      'RATE_LIMITED',
      429,
      { retryAfterMinutes: payload?.retryAfter }
    );
  }

  const details = payload?.error?.details ?? {};
  throw new RecoveryError(
    payload?.error?.message ||
      payload?.message ||
      'No pudimos completar la solicitud. Inténtalo de nuevo.',
    (details.code as RecoveryErrorCode) || 'UNKNOWN',
    response.status,
    { attemptsLeft: details.attemptsLeft }
  );
};

export interface RequestCodeData {
  codeLength: number;
  expiresInMinutes: number;
  resendAfterSeconds: number;
}

/** Paso 1: pide el código al correo de la cuenta (siempre responde igual). */
export const requestResetCode = (identifier: string) =>
  post<RequestCodeData>('auth/forgot-password', { identifier });

/** Paso 2: verifica el código y entrega el token de un solo uso. */
export const verifyResetCode = (identifier: string, code: string) =>
  post<{ resetToken: string; expiresInSeconds: number }>(
    'auth/verify-reset-code',
    { identifier, code }
  );

/** Paso 3: fija la contraseña nueva (cierra todas las sesiones anteriores). */
export const resetPasswordWithToken = (
  resetToken: string,
  newPassword: string,
  confirmPassword: string
) =>
  post<Record<string, never>>('auth/reset-password', {
    resetToken,
    newPassword,
    confirmPassword,
  });
