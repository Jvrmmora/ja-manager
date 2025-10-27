import { Request, Response, NextFunction } from 'express';
import { pointsService } from '../services/pointsService';
import PointsTransaction from '../models/PointsTransaction';

/**
 * Asignar puntos manualmente (por actividad)
 */
export const assignPoints = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { youngId, activityCategoryId, description, points, seasonId } =
      req.body;

    // @ts-ignore - El usuario autenticado está en req.user
    const assignedBy = req.user?.userId;

    if (!youngId || !activityCategoryId || !description || !points) {
      return res.status(400).json({
        success: false,
        message:
          'Faltan campos requeridos: youngId, activityCategoryId, description, points',
      });
    }

    if (!assignedBy) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado',
      });
    }

    const transaction = await pointsService.assignActivityPoints(
      youngId,
      activityCategoryId,
      description,
      assignedBy,
      points,
      seasonId
    );

    res.status(201).json({
      success: true,
      message: 'Puntos asignados exitosamente',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener puntos totales de un joven
 */
export const getYoungTotalPoints = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { youngId } = req.params;
    const { seasonId } = req.query;

    const totalPoints = await pointsService.getTotalPoints(
      youngId,
      seasonId as string
    );

    res.status(200).json({
      success: true,
      data: {
        youngId,
        seasonId: seasonId || 'current',
        totalPoints,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener desglose de puntos de un joven
 */
export const getYoungPointsBreakdown = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { youngId } = req.params;
    const { seasonId } = req.query;

    const breakdown = await pointsService.getPointsBreakdown(
      youngId,
      seasonId as string
    );

    res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener historial de transacciones de un joven
 */
export const getYoungHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { youngId } = req.params;
    const { seasonId, limit = '50', skip = '0' } = req.query;

    const history = await pointsService.getYoungHistory(
      youngId,
      seasonId as string,
      parseInt(limit as string),
      parseInt(skip as string)
    );

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todas las transacciones (admin)
 */
export const getAllTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { seasonId, type, limit = '100', skip = '0' } = req.query;

    const query: any = {};

    if (seasonId) {
      query.seasonId = seasonId;
    }

    if (type) {
      query.type = type;
    }

    const transactions = await PointsTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string))
      .populate('youngId', 'fullName profileImage placa')
      .populate('seasonId', 'name')
      .populate('activityCategoryId', 'name icon')
      .populate('assignedBy', 'fullName')
      .populate('referredYoungId', 'fullName');

    const total = await PointsTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una transacción (solo para correcciones)
 */
export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await pointsService.deleteTransaction(id);

    res.status(200).json({
      success: true,
      message: 'Transacción eliminada exitosamente',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener el ranking/leaderboard de puntos
 */
export const getLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { seasonId, group, limit } = req.query;

    const ranking = await pointsService.getLeaderboard({
      seasonId: seasonId as string,
      group: group ? parseInt(group as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      success: true,
      ranking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener la posición de un joven en el ranking
 */
export const getYoungPosition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { youngId } = req.params;
    const { seasonId } = req.query;

    const position = await pointsService.getYoungPosition(
      youngId,
      seasonId as string
    );

    res.status(200).json({
      success: true,
      position,
    });
  } catch (error) {
    next(error);
  }
};
