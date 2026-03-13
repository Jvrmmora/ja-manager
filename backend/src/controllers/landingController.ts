import { Request, Response } from 'express';
import LandingContent from '../models/LandingContent';
import LandingMedia from '../models/LandingMedia';
import LandingMeeting from '../models/LandingMeetings';
import { azureBlobStorageService } from '../services/azureBlobStorageService';
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
} from '../utils/errorHandler';
import logger from '../utils/logger';

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

      // Obtener media publicada por categoría
      const mediaByCategory = await LandingMedia.find({
        isPublished: true,
      })
        .sort({ category: 1, order: 1 })
        .lean();

      // Organizar media por categoría
      const media = {
        hero: mediaByCategory.filter(m => m.category === 'hero'),
        gallery: mediaByCategory.filter(m => m.category === 'gallery'),
        testimonial: mediaByCategory.filter(m => m.category === 'testimonial'),
        event: mediaByCategory.filter(m => m.category === 'event'),
        resource: mediaByCategory.filter(m => m.category === 'resource'),
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
      const { title, subtitle, description, schedule, modality, order } =
        req.body;

      if (!title || !subtitle || !description || !schedule || !modality) {
        throw new ValidationError('Faltan campos requeridos');
      }

      const newMeeting = new LandingMeeting({
        title,
        subtitle,
        description,
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

      const meeting = await LandingMeeting.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!meeting) {
        throw new NotFoundError('Reunión no encontrada');
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

    const media = await LandingMedia.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!media) {
      throw new NotFoundError('Media no encontrado');
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

    // Hard delete obligatorio en Azure antes de borrar el registro.
    if (media.mediaUrl) {
      if (!azureBlobStorageService.isServiceConfigured()) {
        throw new ValidationError(
          'Azure Blob Storage no está configurado para eliminar el archivo físico'
        );
      }

      const parsedBlob = azureBlobStorageService.parseBlobUrl(media.mediaUrl);
      if (!parsedBlob) {
        throw new ValidationError(
          'No se pudo determinar el contenedor/blob desde la URL del archivo'
        );
      }

      await azureBlobStorageService.deleteFile(
        parsedBlob.containerName,
        parsedBlob.blobName
      );
    }

    await media.deleteOne();

    logger.info('Media eliminado de Azure y DB', {
      context: 'LandingController',
      mediaId: id,
      mediaUrl: media.mediaUrl,
    });

    res.status(200).json({
      success: true,
      message: 'Media eliminado exitosamente',
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
 * POST /api/admin/landing/media/upload - Subir archivo a Azure y crear registro en DB
 */
export const uploadMediaFile = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        throw new ValidationError('No hay archivo para subir');
      }

      if (!azureBlobStorageService.isServiceConfigured()) {
        throw new Error('Azure Blob Storage no está configurado');
      }

      const {
        category = 'gallery',
        altText = '',
        title = '',
        description = '',
        order = 0,
      } = req.body;

      // Generar nombre único
      const blobName = azureBlobStorageService.generateUniqueFileName(
        req.file.originalname,
        category
      );

      // Subir a Azure
      const mediaUrl = await azureBlobStorageService.uploadFile(
        'ja-fotos',
        blobName,
        req.file.buffer,
        req.file.mimetype
      );

      // Determinar mediaType desde mimetype
      const mediaType = req.file.mimetype.startsWith('video/')
        ? 'video'
        : req.file.mimetype === 'application/pdf'
          ? 'document'
          : 'image';

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

      logger.info('Archivo subido a Azure y guardado en DB', {
        context: 'LandingController',
        blobName,
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
