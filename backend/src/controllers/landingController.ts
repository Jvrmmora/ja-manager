import { Request, Response } from 'express';
import crypto from 'crypto';
import * as landingService from '../services/landingService';
import { asyncHandler } from '../utils/errorHandler';

const VISITOR_COOKIE_NAME = 'landing_vid';

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || rawValue.length === 0) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
};

const getCookieMaxAgeSecondsUntilYearEnd = (now: Date): number => {
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
  const seconds = Math.floor((endOfYear.getTime() - now.getTime()) / 1000);
  return Math.max(seconds, 60);
};

const getOrCreateVisitorId = (req: Request, res: Response): string => {
  const cookies = parseCookies(req.headers.cookie);
  const existingVisitorId = cookies[VISITOR_COOKIE_NAME];

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = crypto.randomUUID();
  const maxAge = getCookieMaxAgeSecondsUntilYearEnd(new Date());
  const cookieParts = [
    `${VISITOR_COOKIE_NAME}=${encodeURIComponent(visitorId)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }

  res.append('Set-Cookie', cookieParts.join('; '));
  return visitorId;
};

const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    const source = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(',')[0];
    return source.trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

const hashValue = (value: string): string => {
  const salt = process.env.VISITOR_HASH_SALT || 'landing-visitor-salt';
  return crypto.createHash('sha256').update(`${value}:${salt}`).digest('hex');
};

/**
 * GET /api/landing - Obtener contenido público de landing
 */
export const getLandingContent = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await landingService.getLandingContent();
    res.status(200).json({ success: true, data });
  }
);

/**
 * POST /api/landing/metrics/visit - Registrar visita única anual
 */
export const trackLandingVisit = asyncHandler(
  async (req: Request, res: Response) => {
    const now = new Date();
    const year = now.getFullYear();
    const visitorId = getOrCreateVisitorId(req, res);
    const visitorHash = hashValue(`${visitorId}:${year}`);
    const ipHash = hashValue(getClientIp(req));
    const userAgent = req.get('user-agent')?.slice(0, 500);

    const data = await landingService.recordLandingVisit({
      year,
      visitorHash,
      ipHash,
      userAgent,
      now,
    });

    res.status(200).json({ success: true, data });
  }
);

/**
 * GET /api/landing/metrics/visit - Obtener métricas anuales de visitas
 */
export const getLandingVisitMetrics = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await landingService.getLandingVisitMetrics();
    res.status(200).json({ success: true, data });
  }
);

/**
 * GET /api/admin/landing - Obtener contenido de landing para admin
 */
export const getAdminLandingContent = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await landingService.getAdminLandingContent();
    res.status(200).json({ success: true, data });
  }
);

/**
 * PUT /api/admin/landing/content - Actualizar contenido general
 */
export const updateLandingContent = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await landingService.updateLandingContent(req.body);
    res.status(200).json({
      success: true,
      message: 'Contenido actualizado exitosamente',
      data,
    });
  }
);

/**
 * POST /api/admin/landing/meetings - Crear reunión
 */
export const createMeeting = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await landingService.createMeeting(req.body);
    res.status(201).json({
      success: true,
      message: 'Reunión creada exitosamente',
      data,
    });
  }
);

/**
 * PUT /api/admin/landing/meetings/:id - Actualizar reunión
 */
export const updateMeeting = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await landingService.updateMeeting(id, req.body);
    res.status(200).json({
      success: true,
      message: 'Reunión actualizada exitosamente',
      data,
    });
  }
);

/**
 * DELETE /api/admin/landing/meetings/:id - Eliminar reunión
 */
export const deleteMeeting = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await landingService.deleteMeeting(id);
    res.status(200).json({
      success: true,
      message: 'Reunión eliminada exitosamente',
    });
  }
);

/**
 * POST /api/admin/landing/meetings/upload-image - Subir la imagen de una reunión
 *
 * Sube el archivo a la carpeta propia de reuniones en Cloudinary y devuelve la
 * URL. A diferencia de /media/upload, NO crea un registro LandingMedia: la
 * imagen pertenece a la reunión, no aparece en la galería pública ni en la
 * gestión de media, y por tanto no se puede borrar por accidente desde allí.
 */
export const uploadMeetingImage = asyncHandler(
  async (req: Request, res: Response) => {
    const imageUrl = await landingService.uploadMeetingImage(req.file);
    res.status(201).json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: { imageUrl },
    });
  }
);

/**
 * POST /api/admin/landing/media - Crear media
 */
export const createMedia = asyncHandler(async (req: Request, res: Response) => {
  const data = await landingService.createMedia(req.body);
  res.status(201).json({
    success: true,
    message: 'Media creado exitosamente',
    data,
  });
});

/**
 * PUT /api/admin/landing/media/:id - Actualizar media
 */
export const updateMedia = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await landingService.updateMedia(id, req.body);
  res.status(200).json({
    success: true,
    message: 'Media actualizado exitosamente',
    data,
  });
});

/**
 * DELETE /api/admin/landing/media/:id - Eliminar media
 */
export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stillReferenced } = await landingService.deleteMedia(id);
  res.status(200).json({
    success: true,
    message: stillReferenced
      ? 'Se quitó de la galería. El archivo se conservó porque sigue en uso en otra sección.'
      : 'Media eliminado exitosamente',
  });
});

/**
 * POST /api/admin/landing/media/upload - Subir archivo a Cloudinary y crear registro en DB
 */
export const uploadMediaFile = asyncHandler(
  async (req: Request, res: Response) => {
    const data = await landingService.uploadMediaFile(req.file, req.body);
    res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      data,
    });
  }
);
