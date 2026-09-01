import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Map para almacenar intentos por IP - Birthday
const ipAttempts = new Map<string, RateLimitEntry>();

// Maps para intentos de login (protección contra fuerza bruta / credential stuffing)
const loginIpAttempts = new Map<string, RateLimitEntry>();
const loginUserAttempts = new Map<string, RateLimitEntry>();

// Map para almacenar intentos de registro por IP
const registrationHourlyAttempts = new Map<string, RateLimitEntry>();
const registrationDailyAttempts = new Map<string, RateLimitEntry>();
const landingVisitHourlyAttempts = new Map<string, RateLimitEntry>();
const contactHourlyAttempts = new Map<string, RateLimitEntry>();
const contactDailyAttempts = new Map<string, RateLimitEntry>();

// Configuración Birthday
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Limpiar cada 10 minutos

// Configuración Login
const LOGIN_MAX_PER_IP = 10; // por ventana
const LOGIN_MAX_PER_USER = 5; // por ventana
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// Configuración Registration
const REGISTRATION_MAX_HOURLY = 3;
const REGISTRATION_MAX_DAILY = 10;
const REGISTRATION_HOUR_MS = 60 * 60 * 1000; // 1 hora
const REGISTRATION_DAY_MS = 24 * 60 * 60 * 1000; // 24 horas

// Configuración Landing Metrics
const LANDING_VISIT_MAX_HOURLY = 240;
const LANDING_VISIT_HOUR_MS = 60 * 60 * 1000; // 1 hora

// Configuracion Contact Form
const CONTACT_MAX_HOURLY = 4;
const CONTACT_MAX_DAILY = 12;
const CONTACT_HOUR_MS = 60 * 60 * 1000; // 1 hora
const CONTACT_DAY_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Incrementa el contador de una clave en un mapa con ventana deslizante simple.
 * Devuelve la entrada actualizada y si superó el límite.
 */
function hitLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  max: number,
  windowMs: number
): { blocked: boolean; retryAfterMinutes: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs };
    store.set(key, entry);
    return { blocked: false, retryAfterMinutes: 0 };
  }

  entry.count++;
  const blocked = entry.count > max;
  return {
    blocked,
    retryAfterMinutes: Math.ceil((entry.resetTime - now) / 1000 / 60),
  };
}

/**
 * Middleware de rate limiting para el login.
 * Límite: 10 intentos por IP y 5 por usuario cada 15 minutos.
 * Protege contra fuerza bruta y credential stuffing.
 */
export const loginLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIp = getClientIp(req);
  const rawUser =
    typeof req.body?.username === 'string' ? req.body.username : '';
  const userKey = rawUser.trim().toLowerCase().slice(0, 120) || 'unknown';

  const ipResult = hitLimit(
    loginIpAttempts,
    clientIp,
    LOGIN_MAX_PER_IP,
    LOGIN_WINDOW_MS
  );
  const userResult = hitLimit(
    loginUserAttempts,
    userKey,
    LOGIN_MAX_PER_USER,
    LOGIN_WINDOW_MS
  );

  if (ipResult.blocked || userResult.blocked) {
    const retryAfter = Math.max(
      ipResult.retryAfterMinutes,
      userResult.retryAfterMinutes
    );

    logger.warn('Rate limiter: Límite de intentos de login excedido', {
      context: 'RateLimiter',
      method: 'loginLimiter',
      ip: clientIp,
      by: ipResult.blocked ? 'ip' : 'user',
      remainingMinutes: retryAfter,
    });

    res.status(429).json({
      success: false,
      message: `Demasiados intentos de inicio de sesión. Intenta de nuevo en ${retryAfter} minutos.`,
      retryAfter,
    });
    return;
  }

  next();
};

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
 * Middleware de rate limiting para registro de nuevos usuarios
 * Límite: 3 intentos por hora, 10 por día por IP
 */
export const registrationLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIp = getClientIp(req);
  const now = Date.now();

  // Verificar límite por hora
  let hourlyEntry = registrationHourlyAttempts.get(clientIp);
  if (!hourlyEntry || now > hourlyEntry.resetTime) {
    hourlyEntry = {
      count: 1,
      resetTime: now + REGISTRATION_HOUR_MS,
    };
    registrationHourlyAttempts.set(clientIp, hourlyEntry);
  } else {
    hourlyEntry.count++;
  }

  // Verificar límite diario
  let dailyEntry = registrationDailyAttempts.get(clientIp);
  if (!dailyEntry || now > dailyEntry.resetTime) {
    dailyEntry = {
      count: 1,
      resetTime: now + REGISTRATION_DAY_MS,
    };
    registrationDailyAttempts.set(clientIp, dailyEntry);
  } else {
    dailyEntry.count++;
  }

  // Verificar si superó el límite por hora
  if (hourlyEntry.count > REGISTRATION_MAX_HOURLY) {
    const remainingTime = Math.ceil((hourlyEntry.resetTime - now) / 1000 / 60);

    logger.warn('Rate limiter: Límite de registros por hora excedido', {
      context: 'RateLimiter',
      method: 'registrationLimiter',
      ip: clientIp,
      attemptsHourly: hourlyEntry.count,
      remainingMinutes: remainingTime,
    });

    res.status(429).json({
      success: false,
      message: `Demasiados intentos de registro. Por favor, intenta de nuevo en ${remainingTime} minutos.`,
      retryAfter: remainingTime,
    });
    return;
  }

  // Verificar si superó el límite diario
  if (dailyEntry.count > REGISTRATION_MAX_DAILY) {
    const remainingHours = Math.ceil(
      (dailyEntry.resetTime - now) / 1000 / 60 / 60
    );

    logger.warn('Rate limiter: Límite de registros diarios excedido', {
      context: 'RateLimiter',
      method: 'registrationLimiter',
      ip: clientIp,
      attemptsDaily: dailyEntry.count,
      remainingHours: remainingHours,
    });

    res.status(429).json({
      success: false,
      message: `Has excedido el límite de registros por día. Por favor, intenta de nuevo en ${remainingHours} horas.`,
      retryAfter: remainingHours * 60,
    });
    return;
  }

  logger.info('Rate limiter: Registro permitido', {
    context: 'RateLimiter',
    method: 'registrationLimiter',
    ip: clientIp,
    attemptsHourly: hourlyEntry.count,
    attemptsDaily: dailyEntry.count,
    remainingHourly: REGISTRATION_MAX_HOURLY - hourlyEntry.count,
    remainingDaily: REGISTRATION_MAX_DAILY - dailyEntry.count,
  });

  next();
};

/**
 * Middleware de rate limiting para tracking de visitas de landing
 * Límite: 240 intentos por IP por hora
 */
export const landingVisitLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIp = getClientIp(req);
  const now = Date.now();

  let hourlyEntry = landingVisitHourlyAttempts.get(clientIp);
  if (!hourlyEntry || now > hourlyEntry.resetTime) {
    hourlyEntry = {
      count: 1,
      resetTime: now + LANDING_VISIT_HOUR_MS,
    };
    landingVisitHourlyAttempts.set(clientIp, hourlyEntry);
    next();
    return;
  }

  hourlyEntry.count++;

  if (hourlyEntry.count > LANDING_VISIT_MAX_HOURLY) {
    const remainingMinutes = Math.ceil(
      (hourlyEntry.resetTime - now) / 1000 / 60
    );

    logger.warn('Rate limiter: Límite de tracking landing excedido', {
      context: 'RateLimiter',
      method: 'landingVisitLimiter',
      ip: clientIp,
      attemptsHourly: hourlyEntry.count,
      remainingMinutes,
    });

    res.status(429).json({
      success: false,
      message: `Demasiadas solicitudes de tracking. Intenta de nuevo en ${remainingMinutes} minutos.`,
      retryAfter: remainingMinutes,
    });
    return;
  }

  next();
};

/**
 * Middleware de rate limiting para formulario de contacto
 * Limite: 4 intentos por hora y 12 por dia por IP
 */
export const contactFormLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const clientIp = getClientIp(req);
  const now = Date.now();

  let hourlyEntry = contactHourlyAttempts.get(clientIp);
  if (!hourlyEntry || now > hourlyEntry.resetTime) {
    hourlyEntry = {
      count: 1,
      resetTime: now + CONTACT_HOUR_MS,
    };
    contactHourlyAttempts.set(clientIp, hourlyEntry);
  } else {
    hourlyEntry.count++;
  }

  let dailyEntry = contactDailyAttempts.get(clientIp);
  if (!dailyEntry || now > dailyEntry.resetTime) {
    dailyEntry = {
      count: 1,
      resetTime: now + CONTACT_DAY_MS,
    };
    contactDailyAttempts.set(clientIp, dailyEntry);
  } else {
    dailyEntry.count++;
  }

  if (hourlyEntry.count > CONTACT_MAX_HOURLY) {
    const remainingMinutes = Math.ceil((hourlyEntry.resetTime - now) / 1000 / 60);

    res.status(429).json({
      success: false,
      message: `Demasiados intentos de contacto. Intenta de nuevo en ${remainingMinutes} minutos.`,
      retryAfter: remainingMinutes,
    });
    return;
  }

  if (dailyEntry.count > CONTACT_MAX_DAILY) {
    const remainingHours = Math.ceil((dailyEntry.resetTime - now) / 1000 / 60 / 60);

    res.status(429).json({
      success: false,
      message: `Has alcanzado el limite diario de mensajes. Intenta de nuevo en ${remainingHours} horas.`,
      retryAfter: remainingHours * 60,
    });
    return;
  }

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

  // Limpiar birthday attempts
  for (const [ip, entry] of ipAttempts.entries()) {
    if (now > entry.resetTime) {
      ipAttempts.delete(ip);
      cleanedCount++;
    }
  }

  // Limpiar registration hourly attempts
  for (const [ip, entry] of registrationHourlyAttempts.entries()) {
    if (now > entry.resetTime) {
      registrationHourlyAttempts.delete(ip);
      cleanedCount++;
    }
  }

  // Limpiar registration daily attempts
  for (const [ip, entry] of registrationDailyAttempts.entries()) {
    if (now > entry.resetTime) {
      registrationDailyAttempts.delete(ip);
      cleanedCount++;
    }
  }

  // Limpiar landing metrics hourly attempts
  for (const [ip, entry] of landingVisitHourlyAttempts.entries()) {
    if (now > entry.resetTime) {
      landingVisitHourlyAttempts.delete(ip);
      cleanedCount++;
    }
  }

  // Limpiar login attempts (por IP y por usuario)
  for (const [key, entry] of loginIpAttempts.entries()) {
    if (now > entry.resetTime) {
      loginIpAttempts.delete(key);
      cleanedCount++;
    }
  }
  for (const [key, entry] of loginUserAttempts.entries()) {
    if (now > entry.resetTime) {
      loginUserAttempts.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info('Rate limiter: Limpieza de entradas expiradas', {
      context: 'RateLimiter',
      method: 'cleanupExpiredEntries',
      cleanedCount,
      remainingBirthday: ipAttempts.size,
      remainingRegistrationHourly: registrationHourlyAttempts.size,
      remainingRegistrationDaily: registrationDailyAttempts.size,
      remainingLandingVisitsHourly: landingVisitHourlyAttempts.size,
    });
  }
}

// Iniciar limpieza automática (unref para no impedir el apagado del proceso)
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS).unref();

logger.info('Rate limiter inicializado', {
  context: 'RateLimiter',
  maxAttempts: MAX_ATTEMPTS,
  windowMinutes: WINDOW_MS / 1000 / 60,
  cleanupIntervalMinutes: CLEANUP_INTERVAL_MS / 1000 / 60,
});
