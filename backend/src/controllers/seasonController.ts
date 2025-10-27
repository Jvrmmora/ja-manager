import { Request, Response, NextFunction } from 'express';
import Season from '../models/Season';

/**
 * Crear una nueva temporada
 */
export const createSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, startDate, endDate, status, prizes, settings } = req.body;

    // Validar que las fechas sean válidas
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      });
    }

    // Si se está creando como ACTIVE, verificar que no haya otra activa
    if (status === 'ACTIVE') {
      const activeSeason = await Season.findOne({ status: 'ACTIVE' });
      if (activeSeason) {
        return res.status(400).json({
          success: false,
          message:
            'Ya existe una temporada activa. Finaliza la temporada actual primero.',
        });
      }
    }

    const season = await Season.create({
      name,
      startDate,
      endDate,
      status: status || 'UPCOMING',
      prizes,
      settings: {
        attendancePoints: settings?.attendancePoints || 10,
        referralBonusPoints: settings?.referralBonusPoints || 30,
        referralWelcomePoints: settings?.referralWelcomePoints || 10,
        streakMinDays: settings?.streakMinDays || 3,
        streakLostAfterDays: settings?.streakLostAfterDays || 2,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Temporada creada exitosamente',
      data: season,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las temporadas
 */
export const getSeasons = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const seasons = await Season.find().sort({ startDate: -1 }).select('-__v');

    res.status(200).json({
      success: true,
      count: seasons.length,
      data: seasons,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener la temporada activa
 */
export const getActiveSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const season = await Season.findOne({ status: 'ACTIVE' }).select('-__v');

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'No hay temporada activa',
      });
    }

    res.status(200).json({
      success: true,
      data: season,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener una temporada por ID
 */
export const getSeasonById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const season = await Season.findById(id).select('-__v');

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada',
      });
    }

    res.status(200).json({
      success: true,
      data: season,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una temporada
 */
export const updateSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const season = await Season.findById(id);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada',
      });
    }

    // Si se está activando esta temporada, desactivar las demás
    if (updates.status === 'ACTIVE' && season.status !== 'ACTIVE') {
      await Season.updateMany(
        { _id: { $ne: id }, status: 'ACTIVE' },
        { status: 'COMPLETED' }
      );
    }

    // Validar fechas si se están actualizando
    if (updates.startDate || updates.endDate) {
      const startDate = new Date(updates.startDate || season.startDate);
      const endDate = new Date(updates.endDate || season.endDate);

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'La fecha de fin debe ser posterior a la fecha de inicio',
        });
      }
    }

    Object.assign(season, updates);
    await season.save();

    res.status(200).json({
      success: true,
      message: 'Temporada actualizada exitosamente',
      data: season,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activar una temporada
 */
export const activateSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const season = await Season.findById(id);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada',
      });
    }

    if (season.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Esta temporada ya está activa',
      });
    }

    await season.activate();

    res.status(200).json({
      success: true,
      message: 'Temporada activada exitosamente',
      data: season,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Finalizar una temporada
 */
export const completeSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const season = await Season.findById(id);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada',
      });
    }

    if (season.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Esta temporada ya está finalizada',
      });
    }

    await season.complete();

    res.status(200).json({
      success: true,
      message: 'Temporada finalizada exitosamente',
      data: season,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una temporada
 */
export const deleteSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const season = await Season.findById(id);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada',
      });
    }

    // No permitir eliminar temporadas activas
    if (season.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message:
          'No se puede eliminar una temporada activa. Finalízala primero.',
      });
    }

    await season.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Temporada eliminada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
