import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Map para almacenar intentos por IP
const ipAttempts = new Map<string, RateLimitEntry>();

// Configuración
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Limpiar cada 10 minutos

/**
 * Middleware de rate limiting para reclamación de puntos de cumpleaños
 * Límite: 5 intentos por IP por hora
 */
export const birthdayClaimLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIp = getClientIp(req);
  const now = Date.now();

  // Obtener o crear entrada para esta IP
  let entry = ipAttempts.get(clientIp);

  if (!entry || now > entry.resetTime) {
    // Crear nueva entrada o resetear si expiró
    entry = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    ipAttempts.set(clientIp, entry);

    logger.info('Rate limiter: Nuevo intento registrado', {
      context: 'RateLimiter',
      method: 'birthdayClaimLimiter',
      ip: clientIp,
      attempts: entry.count,
    });

    next();
    return;
  }

  // Incrementar contador
  entry.count++;

  // Verificar si superó el límite
  if (entry.count > MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((entry.resetTime - now) / 1000 / 60); // minutos

    logger.warn('Rate limiter: Límite de intentos excedido', {
      context: 'RateLimiter',
      method: 'birthdayClaimLimiter',
      ip: clientIp,
      attempts: entry.count,
      remainingMinutes: remainingTime,
    });

    res.status(429).json({
      success: false,
      message: `Demasiados intentos. Por favor, intenta de nuevo en ${remainingTime} minutos.`,
      retryAfter: remainingTime,
    });
    return;
  }

  logger.info('Rate limiter: Intento permitido', {
    context: 'RateLimiter',
    method: 'birthdayClaimLimiter',
    ip: clientIp,
    attempts: entry.count,
    remaining: MAX_ATTEMPTS - entry.count,
  });

  next();
};

/**
 * Obtiene la IP del cliente considerando proxies
 */
function getClientIp(req: Request): string {
  // Intentar obtener IP real considerando proxies
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Limpia entradas expiradas del mapa
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [ip, entry] of ipAttempts.entries()) {
    if (now > entry.resetTime) {
      ipAttempts.delete(ip);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info('Rate limiter: Limpieza de entradas expiradas', {
      context: 'RateLimiter',
      method: 'cleanupExpiredEntries',
      cleanedCount,
      remainingEntries: ipAttempts.size,
    });
  }
}

// Iniciar limpieza automática
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);

logger.info('Rate limiter inicializado', {
  context: 'RateLimiter',
  maxAttempts: MAX_ATTEMPTS,
  windowMinutes: WINDOW_MS / 1000 / 60,
  cleanupIntervalMinutes: CLEANUP_INTERVAL_MS / 1000 / 60,
});
