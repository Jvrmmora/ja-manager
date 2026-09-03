import { Request, Response } from 'express';
import crypto from 'crypto';
import LandingContent from '../models/LandingContent';
import LandingMedia from '../models/LandingMedia';
import LandingMeeting from '../models/LandingMeetings';
import LandingVisitMetric from '../models/LandingVisitMetric';
import LandingVisitSummary from '../models/LandingVisitSummary';
import {
  uploadLandingMediaToCloudinary,
  deleteLandingMediaFromCloudinary,
  extractPublicId,
  landingPublicIdFromUrl,
} from '../config/cloudinary';
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
} from '../utils/errorHandler';
import logger from '../utils/logger';

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

// Categoría (y carpeta en Cloudinary) propia de las imágenes de reuniones.
// Se mantienen separadas de la galería para que no aparezcan en la landing
// pública ni se puedan borrar por error desde la gestión de media.
const MEETINGS_CATEGORY = 'meetings';
const MEETINGS_FOLDER_SEGMENT = '/ja-manager/landing/meetings/';

/**
 * Borra de Cloudinary la imagen de una reunión, sólo si la URL apunta a la
 * carpeta propia de reuniones (nunca toca imágenes de la galería). Es
 * best-effort: si Cloudinary falla, se registra y se continúa.
 */
const destroyMeetingImage = async (url?: string | null): Promise<void> => {
  if (
    !url ||
    !url.includes('cloudinary') ||
    !url.includes(MEETINGS_FOLDER_SEGMENT)
  ) {
    return;
  }

  const publicId = landingPublicIdFromUrl(url);
  if (!publicId) return;

  try {
    await deleteLandingMediaFromCloudinary(publicId);
    logger.info('Imagen de reunión eliminada de Cloudinary', {
      context: 'LandingController',
      publicId,
    });
  } catch (error) {
    logger.warn('No se pudo eliminar la imagen de reunión de Cloudinary', {
      context: 'LandingController',
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/landing - Obtener contenido público de landing
 */
export const getLandingContent = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Obtener contenido general (singleton pattern)
      let landingContent = await LandingContent.findOne({
        isPublished: true,
      });

      // Si no existe, crear uno por defecto
      if (!landingContent) {
        landingContent = new LandingContent({
          isPublished: true,
        });
        await landingContent.save();
        logger.info('LandingContent por defecto creado', {
          context: 'LandingController',
        });
      }

      // Obtener reuniones publicadas, ordenadas
      const meetings = await LandingMeeting.find({
        isPublished: true,
      })
        .sort({ order: 1 })
        .lean();

      // Obtener media publicada y agrupar por categoría.
      // Ordenamos cada categoría por fecha de creación descendente (más recientes primero)
      const allMedia = await LandingMedia.find({ isPublished: true })
        .lean();

      const groupAndSort = (cat: string) =>
        allMedia
          .filter(m => m.category === cat)
          .sort((a, b) => {
            const ta = new Date(a.createdAt).getTime();
            const tb = new Date(b.createdAt).getTime();
            return tb - ta;
          });

      const media = {
        hero: groupAndSort('hero'),
        gallery: groupAndSort('gallery'),
        testimonial: groupAndSort('testimonial'),
        event: groupAndSort('event'),
        resource: groupAndSort('resource'),
      };

      res.status(200).json({
        success: true,
        data: {
          content: landingContent,
          meetings,
          media,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo contenido de landing', {
        context: 'LandingController',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
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

    const upsertResult = await LandingVisitMetric.updateOne(
      { year, visitorHash },
      {
        $set: {
          lastSeenAt: now,
          userAgent,
          ipHash,
        },
        $setOnInsert: {
          year,
          visitorHash,
          visitorNumber: 0,
          firstSeenAt: now,
        },
      },
      {
        upsert: true,
      }
    );

    const isNewVisitor = upsertResult.upsertedCount > 0;
    let uniqueVisitorsCount = 0;
    let visitorNumber: number | null = null;

    if (isNewVisitor) {
      const summary = await LandingVisitSummary.findOneAndUpdate(
        { year },
        {
          $setOnInsert: { year },
          $inc: { uniqueVisitorsCount: 1 },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      uniqueVisitorsCount = summary?.uniqueVisitorsCount || 1;
      visitorNumber = uniqueVisitorsCount;

      await LandingVisitMetric.updateOne(
        { year, visitorHash, visitorNumber: 0 },
        { $set: { visitorNumber } }
      );
    } else {
      const [metric, summary] = await Promise.all([
        LandingVisitMetric.findOne({ year, visitorHash }).select(
          'visitorNumber'
        ),
        LandingVisitSummary.findOne({ year }).select('uniqueVisitorsCount'),
      ]);

      visitorNumber =
        typeof metric?.visitorNumber === 'number' && metric.visitorNumber > 0
          ? metric.visitorNumber
          : null;
      uniqueVisitorsCount =
        summary?.uniqueVisitorsCount ||
        (await LandingVisitMetric.countDocuments({ year }));
    }

    logger.info('Metrica de visita landing registrada', {
      context: 'LandingController',
      year,
      isNewVisitor,
      uniqueVisitorsCount,
      visitorNumber,
    });

    res.status(200).json({
      success: true,
      data: {
        year,
        uniqueVisitorsCount,
        visitorNumber,
        isNewVisitor,
      },
    });
  }
);

/**
 * GET /api/landing/metrics/visit - Obtener métricas anuales de visitas
 */
export const getLandingVisitMetrics = asyncHandler(
  async (_req: Request, res: Response) => {
    const year = new Date().getFullYear();

    const summary = await LandingVisitSummary.findOne({ year }).select(
      'uniqueVisitorsCount'
    );

    const uniqueVisitorsCount =
      summary?.uniqueVisitorsCount ||
      (await LandingVisitMetric.countDocuments({ year }));

    res.status(200).json({
      success: true,
      data: {
        year,
        uniqueVisitorsCount,
      },
    });
  }
);

/**
 * GET /api/admin/landing - Obtener contenido de landing para admin
 */
export const getAdminLandingContent = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      let landingContent = await LandingContent.findOne();

      if (!landingContent) {
        landingContent = new LandingContent();
        await landingContent.save();
      }

      const meetings = await LandingMeeting.find().sort({ order: 1 });
      const media = await LandingMedia.find().sort({ category: 1, order: 1 });

      res.status(200).json({
        success: true,
        data: {
          content: landingContent,
          meetings,
          media,
        },
      });
    } catch (error) {
      logger.error('Error obteniendo contenido admin de landing', {
        context: 'LandingController',
      });
      throw error;
    }
  }
);

/**
 * PUT /api/admin/landing/content - Actualizar contenido general
 */
export const updateLandingContent = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new ValidationError('No hay datos para actualizar');
      }

      let landingContent = await LandingContent.findOne();

      if (!landingContent) {
        landingContent = new LandingContent(req.body);
      } else {
        Object.assign(landingContent, req.body);
      }

      await landingContent.save();

      logger.info('Contenido de landing actualizado', {
        context: 'LandingController',
      });

      res.status(200).json({
        success: true,
        message: 'Contenido actualizado exitosamente',
        data: landingContent,
      });
    } catch (error) {
      logger.error('Error actualizando contenido de landing', {
        context: 'LandingController',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
);

/**
 * POST /api/admin/landing/meetings - Crear reunión
 */
export const createMeeting = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        subtitle,
        description,
        imageUrl,
        schedule,
        modality,
        order,
      } = req.body;

      if (!title || !subtitle || !description || !schedule || !modality) {
        throw new ValidationError('Faltan campos requeridos');
      }

      const newMeeting = new LandingMeeting({
        title,
        subtitle,
        description,
        imageUrl: imageUrl || null,
        schedule,
        modality,
        order: order || 0,
        isPublished: true,
      });

      await newMeeting.save();

      logger.info('Reunión creada', {
        context: 'LandingController',
        meetingId: newMeeting._id,
      });

      res.status(201).json({
        success: true,
        message: 'Reunión creada exitosamente',
        data: newMeeting,
      });
    } catch (error) {
      logger.error('Error creando reunión', {
        context: 'LandingController',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
);

/**
 * PUT /api/admin/landing/meetings/:id - Actualizar reunión
 */
export const updateMeeting = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const previous = await LandingMeeting.findById(id).lean();

      const meeting = await LandingMeeting.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!meeting) {
        throw new NotFoundError('Reunión no encontrada');
      }

      // Si la reunión cambió de imagen, limpiamos la anterior en Cloudinary.
      if (previous?.imageUrl && previous.imageUrl !== meeting.imageUrl) {
        await destroyMeetingImage(previous.imageUrl);
      }

      logger.info('Reunión actualizada', {
        context: 'LandingController',
        meetingId: id,
      });

      res.status(200).json({
        success: true,
        message: 'Reunión actualizada exitosamente',
        data: meeting,
      });
    } catch (error) {
      logger.error('Error actualizando reunión', {
        context: 'LandingController',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
);

/**
 * DELETE /api/admin/landing/meetings/:id - Eliminar reunión
 */
export const deleteMeeting = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const meeting = await LandingMeeting.findByIdAndDelete(id);

      if (!meeting) {
        throw new NotFoundError('Reunión no encontrada');
      }

      await destroyMeetingImage(meeting.imageUrl);

      logger.info('Reunión eliminada', {
        context: 'LandingController',
        meetingId: id,
      });

      res.status(200).json({
        success: true,
        message: 'Reunión eliminada exitosamente',
      });
    } catch (error) {
      logger.error('Error eliminando reunión', {
        context: 'LandingController',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
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
    if (!req.file) {
      throw new ValidationError('No hay archivo para subir');
    }

    if (!req.file.mimetype.startsWith('image/')) {
      throw new ValidationError('El archivo debe ser una imagen');
    }

    const imageUrl = await uploadLandingMediaToCloudinary(
      req.file.buffer,
      'image',
      MEETINGS_CATEGORY
    );

    logger.info('Imagen de reunión subida a Cloudinary', {
      context: 'LandingController',
      imageUrl,
    });

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
  try {
    const {
      title,
      description,
      mediaUrl,
      mediaType,
      category,
      altText,
      order,
    } = req.body;

    if (!title || !mediaUrl || !mediaType || !category) {
      throw new ValidationError('Faltan campos requeridos');
    }

    const newMedia = new LandingMedia({
      title,
      description,
      mediaUrl,
      mediaType,
      category,
      altText,
      order: order || 0,
      isPublished: true,
    });

    await newMedia.save();

    // If this media is a hero, update the landing content heroImage to point to it
    if (category === 'hero') {
      try {
        await LandingContent.findOneAndUpdate({}, { heroImage: newMedia.mediaUrl }, { new: true });
      } catch (err) {
        logger.warn('No se pudo actualizar heroImage en LandingContent', {
          context: 'LandingController',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    logger.info('Media creado', {
      context: 'LandingController',
      mediaId: newMedia._id,
    });

    res.status(201).json({
      success: true,
      message: 'Media creado exitosamente',
      data: newMedia,
    });
  } catch (error) {
    logger.error('Error creando media', {
      context: 'LandingController',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

/**
 * PUT /api/admin/landing/media/:id - Actualizar media
 */
export const updateMedia = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Load current media to detect category changes
    const currentMedia = await LandingMedia.findById(id);
    if (!currentMedia) {
      throw new NotFoundError('Media no encontrado');
    }

    const media = await LandingMedia.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!media) {
      throw new NotFoundError('Media no encontrado');
    }

    // If updated media is now hero, set landing heroImage to this mediaUrl
    try {
      const newCategory = (req.body && req.body.category) || media.category;
      if (newCategory === 'hero') {
        await LandingContent.findOneAndUpdate({}, { heroImage: media.mediaUrl }, { new: true });
      } else if (currentMedia.category === 'hero' && newCategory !== 'hero') {
        // If it was hero before but not anymore and it was set as heroImage, clear it
        const landing = await LandingContent.findOne({});
        if (landing && landing.heroImage === currentMedia.mediaUrl) {
          landing.heroImage = null as any;
          await landing.save();
        }
      }
    } catch (err) {
      logger.warn('No se pudo sincronizar heroImage en LandingContent tras update', {
        context: 'LandingController',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    logger.info('Media actualizado', {
      context: 'LandingController',
      mediaId: id,
    });

    res.status(200).json({
      success: true,
      message: 'Media actualizado exitosamente',
      data: media,
    });
  } catch (error) {
    logger.error('Error actualizando media', {
      context: 'LandingController',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

/**
 * DELETE /api/admin/landing/media/:id - Eliminar media
 */
export const deleteMedia = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await LandingMedia.findById(id);

    if (!media) {
      throw new NotFoundError('Media no encontrado');
    }

    // ¿Otra parte de la landing sigue usando este mismo archivo? Si una reunión,
    // el hero u otro registro de media apuntan a la misma URL, borrar el archivo
    // en Cloudinary dejaría esa parte de la landing con una imagen rota. En ese
    // caso se elimina sólo el registro de galería y se conserva el archivo.
    const [meetingUsing, contentUsing, otherMediaUsing] = await Promise.all([
      LandingMeeting.exists({ imageUrl: media.mediaUrl }),
      LandingContent.exists({ heroImage: media.mediaUrl }),
      LandingMedia.exists({
        _id: { $ne: media._id },
        mediaUrl: media.mediaUrl,
      }),
    ]);
    const stillReferenced = Boolean(
      meetingUsing || contentUsing || otherMediaUsing
    );

    if (stillReferenced) {
      logger.info('Archivo conservado en Cloudinary: sigue en uso', {
        context: 'LandingController',
        mediaId: id,
        mediaUrl: media.mediaUrl,
        usedByMeeting: Boolean(meetingUsing),
        usedByHero: Boolean(contentUsing),
        usedByOtherMedia: Boolean(otherMediaUsing),
      });
    }

    // Borrado en Cloudinary (en vez de Azure)
    if (
      !stillReferenced &&
      media.mediaUrl &&
      media.mediaUrl.includes('cloudinary')
    ) {
      try {
        const publicId = extractPublicId(media.mediaUrl);
        if (publicId) {
          // Extraemos la ruta completa antes de la extensión para evitar errores
          const fullPublicId = media.mediaUrl.split('/upload/')[1]?.split('.')[0]?.split('/').slice(1).join('/') || publicId;
          await deleteLandingMediaFromCloudinary(fullPublicId);
        }
      } catch (error) {
        logger.warn('No se pudo eliminar de Cloudinary, continuando...', {
          context: 'LandingController',
          mediaId: id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await media.deleteOne();

    // If this media was set as the hero image, clear the heroImage field
    try {
      const landing = await LandingContent.findOne({});
      if (landing && landing.heroImage && landing.heroImage === media.mediaUrl) {
        landing.heroImage = null as any;
        await landing.save();
      }
    } catch (err) {
      logger.warn('No se pudo limpiar heroImage en LandingContent tras delete', {
        context: 'LandingController',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    logger.info('Media eliminado de DB', {
      context: 'LandingController',
      mediaId: id,
      mediaUrl: media.mediaUrl,
      cloudinaryFilePreserved: stillReferenced,
    });

    res.status(200).json({
      success: true,
      message: stillReferenced
        ? 'Se quitó de la galería. El archivo se conservó porque sigue en uso en otra sección.'
        : 'Media eliminado exitosamente',
    });
  } catch (error) {
    logger.error('Error eliminando media', {
      context: 'LandingController',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

/**
 * POST /api/admin/landing/media/upload - Subir archivo a Cloudinary y crear registro en DB
 */
export const uploadMediaFile = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        throw new ValidationError('No hay archivo para subir');
      }

      const {
        category = 'gallery',
        altText = '',
        title = '',
        description = '',
        order = 0,
      } = req.body;

      // Determinar el mediaType basado en mimetype
      const mediaType = req.file.mimetype.startsWith('video/')
        ? 'video'
        : req.file.mimetype === 'application/pdf'
          ? 'document'
          : 'image';

      // Subir a Cloudinary con nuestra nueva función y tamaño original
      const mediaUrl = await uploadLandingMediaToCloudinary(
        req.file.buffer,
        mediaType as 'image' | 'video' | 'document',
        category
      );

      // Crear registro en MongoDB
      const newMedia = new LandingMedia({
        title: title || req.file.originalname,
        description,
        mediaUrl,
        mediaType,
        category,
        altText,
        order: Number(order),
        isPublished: true,
      });
      await newMedia.save();

      // If uploaded media is hero, set landing heroImage to this mediaUrl
      if (category === 'hero') {
        try {
          await LandingContent.findOneAndUpdate({}, { heroImage: mediaUrl }, { new: true });
        } catch (err) {
          logger.warn('No se pudo actualizar heroImage en LandingContent tras upload', {
            context: 'LandingController',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      logger.info('Archivo subido a Cloudinary y guardado en DB', {
        context: 'LandingController',
        mediaUrl,
        mediaId: newMedia._id,
      });

      res.status(201).json({
        success: true,
        message: 'Archivo subido exitosamente',
        data: newMedia,
      });
    } catch (error) {
      logger.error('Error subiendo archivo', {
        context: 'LandingController',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
);
