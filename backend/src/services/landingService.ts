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
import { NotFoundError, ValidationError } from '../utils/errorHandler';
import logger from '../utils/logger';

// Categoría (y carpeta en Cloudinary) propia de las imágenes de reuniones.
// Se mantienen separadas de la galería para que no aparezcan en la landing
// pública ni se puedan borrar por error desde la gestión de media.
export const MEETINGS_CATEGORY = 'meetings';
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
      context: 'LandingService',
      publicId,
    });
  } catch (error) {
    logger.warn('No se pudo eliminar la imagen de reunión de Cloudinary', {
      context: 'LandingService',
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getLandingContent = async () => {
  let landingContent = await LandingContent.findOne({ isPublished: true });

  if (!landingContent) {
    landingContent = new LandingContent({ isPublished: true });
    await landingContent.save();
    logger.info('LandingContent por defecto creado', {
      context: 'LandingService',
    });
  }

  const meetings = await LandingMeeting.find({ isPublished: true })
    .sort({ order: 1 })
    .lean();

  const allMedia = await LandingMedia.find({ isPublished: true }).lean();

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

  return { content: landingContent, meetings, media };
};

export const recordLandingVisit = async ({
  year,
  visitorHash,
  ipHash,
  userAgent,
  now,
}: {
  year: number;
  visitorHash: string;
  ipHash: string;
  userAgent?: string;
  now: Date;
}) => {
  const upsertResult = await LandingVisitMetric.updateOne(
    { year, visitorHash },
    {
      $set: { lastSeenAt: now, userAgent, ipHash },
      $setOnInsert: {
        year,
        visitorHash,
        visitorNumber: 0,
        firstSeenAt: now,
      },
    },
    { upsert: true }
  );

  const isNewVisitor = upsertResult.upsertedCount > 0;
  let uniqueVisitorsCount = 0;
  let visitorNumber: number | null = null;

  if (isNewVisitor) {
    const summary = await LandingVisitSummary.findOneAndUpdate(
      { year },
      { $setOnInsert: { year }, $inc: { uniqueVisitorsCount: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    uniqueVisitorsCount = summary?.uniqueVisitorsCount || 1;
    visitorNumber = uniqueVisitorsCount;

    await LandingVisitMetric.updateOne(
      { year, visitorHash, visitorNumber: 0 },
      { $set: { visitorNumber } }
    );
  } else {
    const [metric, summary] = await Promise.all([
      LandingVisitMetric.findOne({ year, visitorHash }).select('visitorNumber'),
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
    context: 'LandingService',
    year,
    isNewVisitor,
    uniqueVisitorsCount,
    visitorNumber,
  });

  return { year, uniqueVisitorsCount, visitorNumber, isNewVisitor };
};

export const getLandingVisitMetrics = async () => {
  const year = new Date().getFullYear();

  const summary = await LandingVisitSummary.findOne({ year }).select(
    'uniqueVisitorsCount'
  );

  const uniqueVisitorsCount =
    summary?.uniqueVisitorsCount ||
    (await LandingVisitMetric.countDocuments({ year }));

  return { year, uniqueVisitorsCount };
};

export const getAdminLandingContent = async () => {
  let landingContent = await LandingContent.findOne();

  if (!landingContent) {
    landingContent = new LandingContent();
    await landingContent.save();
  }

  const meetings = await LandingMeeting.find().sort({ order: 1 });
  const media = await LandingMedia.find().sort({ category: 1, order: 1 });

  return { content: landingContent, meetings, media };
};

export const updateLandingContent = async (body: Record<string, any>) => {
  if (!body || Object.keys(body).length === 0) {
    throw new ValidationError('No hay datos para actualizar');
  }

  let landingContent = await LandingContent.findOne();

  if (!landingContent) {
    landingContent = new LandingContent(body);
  } else {
    Object.assign(landingContent, body);
  }

  await landingContent.save();

  logger.info('Contenido de landing actualizado', {
    context: 'LandingService',
  });

  return landingContent;
};

export const createMeeting = async (body: Record<string, any>) => {
  const { title, subtitle, description, imageUrl, schedule, modality, order } =
    body;

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
    context: 'LandingService',
    meetingId: newMeeting._id,
  });

  return newMeeting;
};

export const updateMeeting = async (id: string, body: Record<string, any>) => {
  const previous = await LandingMeeting.findById(id).lean();

  const meeting = await LandingMeeting.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  if (!meeting) {
    throw new NotFoundError('Reunión no encontrada');
  }

  if (previous?.imageUrl && previous.imageUrl !== meeting.imageUrl) {
    await destroyMeetingImage(previous.imageUrl);
  }

  logger.info('Reunión actualizada', {
    context: 'LandingService',
    meetingId: id,
  });

  return meeting;
};

export const deleteMeeting = async (id: string) => {
  const meeting = await LandingMeeting.findByIdAndDelete(id);

  if (!meeting) {
    throw new NotFoundError('Reunión no encontrada');
  }

  await destroyMeetingImage(meeting.imageUrl);

  logger.info('Reunión eliminada', {
    context: 'LandingService',
    meetingId: id,
  });
};

export const uploadMeetingImage = async (file?: Express.Multer.File) => {
  if (!file) {
    throw new ValidationError('No hay archivo para subir');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new ValidationError('El archivo debe ser una imagen');
  }

  const imageUrl = await uploadLandingMediaToCloudinary(
    file.buffer,
    'image',
    MEETINGS_CATEGORY
  );

  logger.info('Imagen de reunión subida a Cloudinary', {
    context: 'LandingService',
    imageUrl,
  });

  return imageUrl;
};

export const createMedia = async (body: Record<string, any>) => {
  const { title, description, mediaUrl, mediaType, category, altText, order } =
    body;

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

  if (category === 'hero') {
    try {
      await LandingContent.findOneAndUpdate(
        {},
        { heroImage: newMedia.mediaUrl },
        { new: true }
      );
    } catch (err) {
      logger.warn('No se pudo actualizar heroImage en LandingContent', {
        context: 'LandingService',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  logger.info('Media creado', {
    context: 'LandingService',
    mediaId: newMedia._id,
  });

  return newMedia;
};

export const updateMedia = async (id: string, body: Record<string, any>) => {
  const currentMedia = await LandingMedia.findById(id);
  if (!currentMedia) {
    throw new NotFoundError('Media no encontrado');
  }

  const media = await LandingMedia.findByIdAndUpdate(id, body, {
    new: true,
    runValidators: true,
  });

  if (!media) {
    throw new NotFoundError('Media no encontrado');
  }

  try {
    const newCategory = (body && body.category) || media.category;
    if (newCategory === 'hero') {
      await LandingContent.findOneAndUpdate(
        {},
        { heroImage: media.mediaUrl },
        { new: true }
      );
    } else if (currentMedia.category === 'hero' && newCategory !== 'hero') {
      const landing = await LandingContent.findOne({});
      if (landing && landing.heroImage === currentMedia.mediaUrl) {
        landing.heroImage = null as any;
        await landing.save();
      }
    }
  } catch (err) {
    logger.warn(
      'No se pudo sincronizar heroImage en LandingContent tras update',
      {
        context: 'LandingService',
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    );
  }

  logger.info('Media actualizado', {
    context: 'LandingService',
    mediaId: id,
  });

  return media;
};

export const deleteMedia = async (id: string) => {
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
    LandingMedia.exists({ _id: { $ne: media._id }, mediaUrl: media.mediaUrl }),
  ]);
  const stillReferenced = Boolean(
    meetingUsing || contentUsing || otherMediaUsing
  );

  if (stillReferenced) {
    logger.info('Archivo conservado en Cloudinary: sigue en uso', {
      context: 'LandingService',
      mediaId: id,
      mediaUrl: media.mediaUrl,
      usedByMeeting: Boolean(meetingUsing),
      usedByHero: Boolean(contentUsing),
      usedByOtherMedia: Boolean(otherMediaUsing),
    });
  }

  if (!stillReferenced && media.mediaUrl && media.mediaUrl.includes('cloudinary')) {
    try {
      const publicId = extractPublicId(media.mediaUrl);
      if (publicId) {
        const fullPublicId =
          media.mediaUrl
            .split('/upload/')[1]
            ?.split('.')[0]
            ?.split('/')
            .slice(1)
            .join('/') || publicId;
        await deleteLandingMediaFromCloudinary(fullPublicId);
      }
    } catch (error) {
      logger.warn('No se pudo eliminar de Cloudinary, continuando...', {
        context: 'LandingService',
        mediaId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  await media.deleteOne();

  try {
    const landing = await LandingContent.findOne({});
    if (landing && landing.heroImage && landing.heroImage === media.mediaUrl) {
      landing.heroImage = null as any;
      await landing.save();
    }
  } catch (err) {
    logger.warn('No se pudo limpiar heroImage en LandingContent tras delete', {
      context: 'LandingService',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  logger.info('Media eliminado de DB', {
    context: 'LandingService',
    mediaId: id,
    mediaUrl: media.mediaUrl,
    cloudinaryFilePreserved: stillReferenced,
  });

  return { stillReferenced };
};

export const uploadMediaFile = async (
  file: Express.Multer.File | undefined,
  body: Record<string, any>
) => {
  if (!file) {
    throw new ValidationError('No hay archivo para subir');
  }

  const {
    category = 'gallery',
    altText = '',
    title = '',
    description = '',
    order = 0,
  } = body;

  const mediaType = file.mimetype.startsWith('video/')
    ? 'video'
    : file.mimetype === 'application/pdf'
      ? 'document'
      : 'image';

  const mediaUrl = await uploadLandingMediaToCloudinary(
    file.buffer,
    mediaType as 'image' | 'video' | 'document',
    category
  );

  const newMedia = new LandingMedia({
    title: title || file.originalname,
    description,
    mediaUrl,
    mediaType,
    category,
    altText,
    order: Number(order),
    isPublished: true,
  });
  await newMedia.save();

  if (category === 'hero') {
    try {
      await LandingContent.findOneAndUpdate(
        {},
        { heroImage: mediaUrl },
        { new: true }
      );
    } catch (err) {
      logger.warn(
        'No se pudo actualizar heroImage en LandingContent tras upload',
        {
          context: 'LandingService',
          error: err instanceof Error ? err.message : 'Unknown error',
        }
      );
    }
  }

  logger.info('Archivo subido a Cloudinary y guardado en DB', {
    context: 'LandingService',
    mediaUrl,
    mediaId: newMedia._id,
  });

  return newMedia;
};
