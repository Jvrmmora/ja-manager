import { Request, Response, NextFunction } from 'express';
import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import Streak from '../models/Streak';
import {
  finalizeSeason,
  getSeasonResults,
  getLatestSeasonResults,
} from '../services/seasonResultsService';

// Campos editables por PUT. El estado solo cambia con /activate y /complete,
// y `results` solo lo escribe el cierre de temporada.
const EDITABLE_FIELDS = [
  'name',
  'description',
  'startDate',
  'endDate',
  'prizes',
  'settings',
] as const;

const DELETE_BLOCKED_MESSAGE =
  'Solo se pueden eliminar temporadas próximas sin datos; las temporadas jugadas quedan en el histórico';

/**
 * Crear una nueva temporada
 */
export const createSeason = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, description, startDate, endDate, status, prizes, settings } =
      req.body;

    // Validar que las fechas sean válidas
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      });
    }

    if (status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'No se puede crear una temporada ya finalizada',
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
      description,
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
        birthdayBonusPoints: settings?.birthdayBonusPoints || 100,
      },
    });

    // Convertir a JSON para aplicar el transform _id -> id
    const seasonJSON = season.toJSON();

    res.status(201).json({
      success: true,
      message: 'Temporada creada exitosamente',
      data: seasonJSON,
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

    // Aplicar toJSON transform para convertir _id a id
    const seasonsJSON = seasons.map(season => season.toJSON());

    res.status(200).json({
      success: true,
      count: seasonsJSON.length,
      data: seasonsJSON,
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

    // Aplicar toJSON transform para convertir _id a id
    const seasonJSON = season.toJSON();

    res.status(200).json({
      success: true,
      data: seasonJSON,
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

    // Aplicar toJSON transform para convertir _id a id
    const seasonJSON = season.toJSON();

    res.status(200).json({
      success: true,
      data: seasonJSON,
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
    const updates: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body?.[field] !== undefined) updates[field] = req.body[field];
    }

    const season = await Season.findById(id);

    if (!season) {
      return res.status(404).json({
        success: false,
        message: 'Temporada no encontrada',
      });
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

    // Aplicar toJSON transform para convertir _id a id
    const seasonJSON = season.toJSON();

    res.status(200).json({
      success: true,
      message: 'Temporada actualizada exitosamente',
      data: seasonJSON,
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

    if (season.status === 'COMPLETED') {
      return res.status(409).json({
        success: false,
        message:
          'Una temporada finalizada no se puede reactivar. Crea una temporada nueva.',
      });
    }

    // Cerrar la temporada activa (congela su premiación) antes de activar otra
    const others = await Season.find({ status: 'ACTIVE', _id: { $ne: id } });
    for (const other of others) {
      await finalizeSeason(String(other._id), req.user?.userId);
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

    if (season.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Solo se puede finalizar la temporada activa',
      });
    }

    const finalized = await finalizeSeason(id, req.user?.userId);

    res.status(200).json({
      success: true,
      message: 'Temporada finalizada exitosamente',
      data: finalized,
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

    // Las temporadas jugadas nunca se borran, así que no hay cascada
    const hasData =
      season.status !== 'UPCOMING' ||
      !!(await PointsTransaction.exists({ seasonId: id })) ||
      !!(await Streak.exists({ seasonId: id }));
    if (hasData) {
      return res
        .status(409)
        .json({ success: false, message: DELETE_BLOCKED_MESSAGE });
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

/**
 * Resultados (premiación) de una temporada finalizada
 */
export const getSeasonResultsById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getSeasonResults(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'La temporada no existe o todavía no ha finalizado',
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * Resultados de la última temporada finalizada (o null si no hay)
 */
export const getLatestResults = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await getLatestSeasonResults();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
