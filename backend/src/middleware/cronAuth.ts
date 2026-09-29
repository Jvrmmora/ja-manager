import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import env from '../config/env';

/**
 * Protege endpoints internos disparados por un cron externo (GitHub Actions)
 * comparando el header `x-cron-secret` contra `CRON_SECRET`. No hay JWT/usuario
 * involucrado, así que este es el único mecanismo de autenticación.
 */
export const requireCronSecret = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const provided = req.headers['x-cron-secret'];

  if (
    !env.cronSecret ||
    typeof provided !== 'string' ||
    provided.length !== env.cronSecret.length ||
    !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(env.cronSecret))
  ) {
    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      message: 'Secreto de cron inválido o ausente',
    });
  }

  next();
};
