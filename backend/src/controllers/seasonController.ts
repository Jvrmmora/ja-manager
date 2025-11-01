import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import Streak from '../models/Streak';
import Attendance from '../models/Attendance';

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

    // Obtener las transacciones de asistencia ANTES de eliminarlas para poder eliminar las asistencias relacionadas
    const attendanceTransactions = await PointsTransaction.find({
      seasonId: id,
      type: 'ATTENDANCE',
    }).select('eventId youngId');

    // 1. Eliminar todas las asistencias relacionadas con esta temporada
    // Eliminamos las asistencias que coinciden exactamente con las transacciones de asistencia
    // de esta temporada (matching both youngId and qrCodeId/eventId)
    if (attendanceTransactions.length > 0) {
      // Crear un conjunto de combinaciones únicas de (youngId, qrCodeId) usando string
      const uniquePairs = new Set<string>();
      attendanceTransactions.forEach(t => {
        const youngId = t.youngId?.toString();
        const qrCodeId = t.eventId?.toString();
        if (youngId && qrCodeId) {
          uniquePairs.add(`${youngId}:${qrCodeId}`);
        }
      });

      // Construir un array de condiciones $or para eliminar todas las asistencias en una sola consulta
      const orConditions = Array.from(uniquePairs).map(pair => {
        const [youngId, qrCodeId] = pair.split(':');
        return {
          youngId: new mongoose.Types.ObjectId(youngId),
          qrCodeId: new mongoose.Types.ObjectId(qrCodeId),
        };
      });

      if (orConditions.length > 0) {
        await Attendance.deleteMany({
          $or: orConditions,
        });
      }
    }

    // 2. Eliminar todos los puntos (transacciones) de esta temporada
    await PointsTransaction.deleteMany({ seasonId: id });

    // 3. Eliminar todas las rachas de esta temporada
    await Streak.deleteMany({ seasonId: id });

    // 4. Finalmente, eliminar la temporada
    await season.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Temporada eliminada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};
