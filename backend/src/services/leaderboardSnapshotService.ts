import mongoose from 'mongoose';
import Season from '../models/Season';
import LeaderboardSnapshot from '../models/LeaderboardSnapshot';
import { pointsService } from './pointsService';
import logger from '../utils/logger';
import { getEndOfWeekColombia } from '../utils/dateUtils';

/**
 * Captura el ranking actual de la temporada activa y lo guarda como snapshot
 * semanal (cierre: sábado). Idempotente por semana/temporada (upsert).
 */
export const captureLeaderboardSnapshot = async (): Promise<void> => {
  try {
    const season = await Season.findOne({ status: 'ACTIVE' });
    if (!season) {
      logger.info('No hay temporada activa, se omite snapshot de ranking', {
        context: 'LeaderboardSnapshotService',
        method: 'captureLeaderboardSnapshot',
      });
      return;
    }

    const seasonId = (season._id as mongoose.Types.ObjectId).toString();

    const ranking = await pointsService.getLeaderboard({ seasonId });

    const weekEndDate = getEndOfWeekColombia();

    await LeaderboardSnapshot.findOneAndUpdate(
      { seasonId: season._id, weekEndDate },
      {
        seasonId: season._id,
        weekEndDate,
        rankings: ranking.map((entry: any) => ({
          youngId: entry.youngId,
          rank: entry.currentRank,
          totalPoints: entry.totalPoints,
        })),
      },
      { upsert: true, new: true }
    );

    logger.info('Snapshot de ranking capturado', {
      context: 'LeaderboardSnapshotService',
      method: 'captureLeaderboardSnapshot',
      seasonId,
      weekEndDate,
      entries: ranking.length,
    });
  } catch (error) {
    logger.error('Error capturando snapshot de ranking', {
      context: 'LeaderboardSnapshotService',
      method: 'captureLeaderboardSnapshot',
      error,
    });
    throw error;
  }
};
