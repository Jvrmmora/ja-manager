/**
 * Formato de placa: @MOD + 2-4 letras + 3 dígitos (ej: @MODJAVI001).
 * Fuente única del regex; antes estaba copiado en modelo, Joi y controladores.
 */
export const PLACA_REGEX = /^@MOD[A-Z]{2,4}\d{3}$/;

/** Normaliza lo que escribe el usuario (espacios, minúsculas). */
export const normalizePlaca = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim().toUpperCase() : '';

export const isValidPlaca = (raw: unknown): boolean =>
  PLACA_REGEX.test(normalizePlaca(raw));
