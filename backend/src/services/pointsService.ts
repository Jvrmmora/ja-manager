import PointsTransaction, {
  PointsTransactionType,
} from '../models/PointsTransaction';
import Season from '../models/Season';
import mongoose from 'mongoose';

export interface CreatePointsTransactionDTO {
  youngId: string;
  seasonId?: string; // Opcional, si no se pasa se usa la temporada activa
  points: number;
  type: PointsTransactionType;
  activityCategoryId?: string;
  description?: string;
  eventId?: string;
  referredYoungId?: string;
  assignedBy?: string;
}

class PointsService {
  /**
   * Crear una nueva transacción de puntos
   */
  async createTransaction(data: CreatePointsTransactionDTO) {
    // Si no se especifica temporada, usar la activa
    let seasonId = data.seasonId;

    if (!seasonId) {
      const activeSeason = await Season.findOne({ status: 'ACTIVE' });
      if (!activeSeason) {
        throw new Error(
          'No hay temporada activa. Por favor, crea o activa una temporada primero.'
        );
      }
      seasonId = (activeSeason._id as mongoose.Types.ObjectId).toString();
    }

    // Validar que la temporada existe
    const season = await Season.findById(seasonId);
    if (!season) {
      throw new Error('La temporada especificada no existe.');
    }

    // Crear la transacción
    const transaction = await PointsTransaction.create({
      youngId: data.youngId,
      seasonId,
      points: data.points,
      type: data.type,
      activityCategoryId: data.activityCategoryId,
      description: data.description,
      eventId: data.eventId,
      referredYoungId: data.referredYoungId,
      assignedBy: data.assignedBy,
    });

    return transaction;
  }

  /**
   * Asignar puntos por asistencia
   */
  async assignAttendancePoints(
    youngId: string,
    eventId: string,
    seasonId?: string
  ) {
    // Obtener temporada activa o usar la especificada
    const season = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    if (!season) {
      throw new Error('No hay temporada activa.');
    }

    // Verificar si ya se asignaron puntos por esta asistencia
    const existingTransaction = await PointsTransaction.findOne({
      youngId: new mongoose.Types.ObjectId(youngId),
      eventId: new mongoose.Types.ObjectId(eventId),
      type: 'ATTENDANCE',
    });

    if (existingTransaction) {
      throw new Error('Ya se asignaron puntos por esta asistencia.');
    }

    // Crear transacción de puntos por asistencia
    return this.createTransaction({
      youngId,
      seasonId: (season._id as mongoose.Types.ObjectId).toString(),
      points: season.settings.attendancePoints,
      type: 'ATTENDANCE',
      eventId,
      description: `Asistencia registrada`,
    });
  }

  /**
   * Asignar puntos por actividad (manual)
   */
  async assignActivityPoints(
    youngId: string,
    activityCategoryId: string,
    description: string,
    assignedBy: string,
    points: number,
    seasonId?: string
  ) {
    return this.createTransaction({
      youngId,
      seasonId,
      points,
      type: 'ACTIVITY',
      activityCategoryId,
      description,
      assignedBy,
    });
  }

  /**
   * Asignar puntos de referido (automático)
   */
  async assignReferralPoints(
    referrerId: string,
    newYoungId: string,
    seasonId?: string
  ) {
    const season = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    if (!season) {
      // Si no hay temporada activa, no asignar puntos pero no fallar
      return null;
    }

    // Puntos para quien refirió
    const bonusTransaction = await this.createTransaction({
      youngId: referrerId,
      seasonId: (season._id as mongoose.Types.ObjectId).toString(),
      points: season.settings.referralBonusPoints,
      type: 'REFERRAL_BONUS',
      referredYoungId: newYoungId,
      description: 'Bonus por invitar a un amigo',
    });

    // Puntos de bienvenida para el nuevo joven
    const welcomeTransaction = await this.createTransaction({
      youngId: newYoungId,
      seasonId: (season._id as mongoose.Types.ObjectId).toString(),
      points: season.settings.referralWelcomePoints,
      type: 'REFERRAL_WELCOME',
      referredYoungId: referrerId,
      description: 'Puntos de bienvenida',
    });

    return {
      bonusTransaction,
      welcomeTransaction,
    };
  }

  /**
   * Obtener puntos totales de un joven en una temporada
   */
  async getTotalPoints(youngId: string, seasonId?: string): Promise<number> {
    const season = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    if (!season) {
      return 0;
    }

    return PointsTransaction.calculateTotalPoints(
      youngId,
      (season._id as mongoose.Types.ObjectId).toString()
    );
  }

  /**
   * Obtener historial de transacciones de un joven
   */
  async getYoungHistory(
    youngId: string,
    seasonId?: string,
    limit = 50,
    skip = 0
  ) {
    const season = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    return PointsTransaction.getYoungHistory(
      youngId,
      season ? (season._id as mongoose.Types.ObjectId).toString() : undefined,
      limit,
      skip
    );
  }

  /**
   * Obtener desglose de puntos por tipo
   */
  async getPointsBreakdown(youngId: string, seasonId?: string) {
    const season = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    if (!season) {
      return {
        total: 0,
        attendance: 0,
        activities: 0,
        referrals: 0,
      };
    }

    const sid = (season._id as mongoose.Types.ObjectId).toString();

    const [attendanceCount, activitiesCount, referralsCount, totalPoints] =
      await Promise.all([
        PointsTransaction.countByType(youngId, sid, 'ATTENDANCE'),
        PointsTransaction.countByType(youngId, sid, 'ACTIVITY'),
        PointsTransaction.countByType(youngId, sid, 'REFERRAL_BONUS'),
        this.getTotalPoints(youngId, sid),
      ]);

    return {
      total: totalPoints,
      attendance: attendanceCount * season.settings.attendancePoints,
      activities: activitiesCount * 10, // Asumiendo 10 pts por actividad
      referrals: referralsCount * season.settings.referralBonusPoints,
      attendanceCount,
      activitiesCount,
      referralsCount,
    };
  }

  /**
   * Eliminar una transacción (solo para correcciones)
   */
  async deleteTransaction(transactionId: string) {
    const transaction = await PointsTransaction.findById(transactionId);

    if (!transaction) {
      throw new Error('Transacción no encontrada.');
    }

    await transaction.deleteOne();
    return transaction;
  }

  /**
   * Obtener el ranking/leaderboard de puntos
   */
  async getLeaderboard(options?: {
    seasonId?: string;
    group?: number;
    limit?: number;
  }) {
    // Obtener temporada activa o usar la especificada
    const season = options?.seasonId
      ? await Season.findById(options.seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    if (!season) {
      return [];
    }

    const seasonId = season._id;

    // Construir match stage para aggregation
    const matchStage: any = {
      seasonId: new mongoose.Types.ObjectId(seasonId as any),
    };

    // Agregar transacciones por joven
    const aggregation: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$youngId',
          totalPoints: { $sum: '$points' },
          attendancePoints: {
            $sum: {
              $cond: [{ $eq: ['$type', 'ATTENDANCE'] }, '$points', 0],
            },
          },
          activityPoints: {
            $sum: {
              $cond: [{ $eq: ['$type', 'ACTIVITY'] }, '$points', 0],
            },
          },
          referrerPoints: {
            $sum: {
              $cond: [{ $eq: ['$type', 'REFERRER_BONUS'] }, '$points', 0],
            },
          },
          referredPoints: {
            $sum: {
              $cond: [{ $eq: ['$type', 'REFERRED_BONUS'] }, '$points', 0],
            },
          },
          bonusPoints: {
            $sum: {
              $cond: [{ $eq: ['$type', 'BONUS'] }, '$points', 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'youngs',
          localField: '_id',
          foreignField: '_id',
          as: 'young',
        },
      },
      { $unwind: '$young' },
    ];

    // Filtro por grupo si se especifica
    if (options?.group) {
      aggregation.push({
        $match: { 'young.group': options.group },
      });
    }

    // Ordenar por puntos totales y añadir ranking
    aggregation.push(
      { $sort: { totalPoints: -1 } },
      {
        $setWindowFields: {
          sortBy: { totalPoints: -1 },
          output: {
            rank: { $rank: {} },
          },
        },
      }
    );

    // Limitar resultados si se especifica
    if (options?.limit) {
      aggregation.push({ $limit: options.limit });
    }

    // Proyectar campos finales
    aggregation.push({
      $project: {
        youngId: '$_id',
        youngName: '$young.fullName',
        profileImage: '$young.profileImage',
        group: '$young.group',
        totalPoints: 1,
        currentRank: '$rank',
        pointsByType: {
          attendance: '$attendancePoints',
          activity: '$activityPoints',
          referrer: '$referrerPoints',
          referred: '$referredPoints',
          bonus: '$bonusPoints',
        },
        _id: 0,
      },
    });

    const ranking = await PointsTransaction.aggregate(aggregation);

    return ranking;
  }

  /**
   * Obtener la posición de un joven específico en el ranking
   */
  async getYoungPosition(youngId: string, seasonId?: string) {
    // Obtener temporada activa o usar la especificada
    const season = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'ACTIVE' });

    if (!season) {
      return {
        rank: 0,
        totalParticipants: 0,
        percentile: 0,
      };
    }

    const sid = season._id;

    // Obtener todos los puntos totales ordenados
    const allTotals = await PointsTransaction.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(sid as any) } },
      {
        $group: {
          _id: '$youngId',
          totalPoints: { $sum: '$points' },
        },
      },
      { $sort: { totalPoints: -1 } },
    ]);

    const totalParticipants = allTotals.length;

    // Encontrar la posición del joven específico
    const youngIndex = allTotals.findIndex(
      (entry: any) => entry._id.toString() === youngId
    );

    if (youngIndex === -1) {
      return {
        rank: totalParticipants + 1,
        totalParticipants,
        percentile: 0,
      };
    }

    const rank = youngIndex + 1;
    const percentile = ((totalParticipants - rank) / totalParticipants) * 100;

    return {
      rank,
      totalParticipants,
      percentile: Math.round(percentile),
    };
  }
}

export const pointsService = new PointsService();
