import mongoose from 'mongoose';
import Season, {
  ISeasonDocument,
  ISeasonPersonStats,
  ISeasonResults,
} from '../models/Season';
import Attendance from '../models/Attendance';
import PointsTransaction from '../models/PointsTransaction';
import Streak from '../models/Streak';
import { pointsService, RANKING_ELIGIBLE_MATCH } from './pointsService';
import { formatDateColombia } from '../utils/dateUtils';

/**
 * Premiación de temporada: calcula y congela el podio y el "Bonus constancia".
 * Aquí solo se LEE de puntos y rachas; cerrar una temporada nunca borra ni
 * modifica datos de los jóvenes. El bonus es un reconocimiento, no da puntos.
 */

export interface SeasonResultsDTO {
  season: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  results: ISeasonResults;
}

/**
 * Ganador del Bonus constancia: una sola persona, la de mejor racha entre los
 * elegibles sin contar al 1.er puesto del podio. Si empatan en racha, gana
 * quien tenga más asistencias (y luego por nombre). Sin rachas, no hay ganador.
 * `winners` es una lista de cero o un elemento.
 */
const computeConstancy = async (
  seasonId: string,
  championId?: string
): Promise<ISeasonResults['constancy']> => {
  const seasonObjectId = new mongoose.Types.ObjectId(seasonId);

  const rows: any[] = await Streak.aggregate([
    { $match: { seasonId: seasonObjectId, bestStreakWeeks: { $gt: 0 } } },
    {
      $lookup: {
        from: 'youngs',
        localField: 'youngId',
        foreignField: '_id',
        as: 'young',
      },
    },
    { $unwind: '$young' },
    { $match: RANKING_ELIGIBLE_MATCH },
    { $sort: { bestStreakWeeks: -1 } },
    {
      $project: {
        _id: 0,
        youngId: 1,
        bestStreakWeeks: 1,
        name: '$young.fullName',
        profileImage: '$young.profileImage',
      },
    },
  ]);

  const candidates = rows.filter(r => String(r.youngId) !== championId);
  const best = candidates[0]?.bestStreakWeeks ?? 0;
  if (!best) return { bestStreakWeeks: 0, winners: [] };

  const top = candidates.filter(r => r.bestStreakWeeks === best);

  const counts: any[] = await PointsTransaction.aggregate([
    {
      $match: {
        seasonId: seasonObjectId,
        type: 'ATTENDANCE',
        youngId: { $in: top.map(r => r.youngId) },
      },
    },
    { $group: { _id: '$youngId', total: { $sum: 1 } } },
  ]);
  const attendanceById = new Map<string, number>(
    counts.map(c => [String(c._id), c.total])
  );

  const winners = top
    .map(r => ({
      youngId: r.youngId,
      name: r.name,
      profileImage: r.profileImage,
      bestStreakWeeks: r.bestStreakWeeks,
      attendanceCount: attendanceById.get(String(r.youngId)) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.attendanceCount - a.attendanceCount || a.name.localeCompare(b.name)
    )
    .slice(0, 1);

  return { bestStreakWeeks: best, winners };
};

const emptyStats = (): ISeasonPersonStats => ({
  attendanceCount: 0,
  attendancePercent: 0,
  bestStreakWeeks: 0,
  totalPoints: 0,
  points: {
    attendance: 0,
    activity: 0,
    referrals: 0,
    forms: 0,
    birthday: 0,
    bonus: 0,
  },
  referrals: 0,
  activities: 0,
  forms: 0,
  earlyArrivals: 0,
  earlyPoints: 0,
  streakBonus: false,
});

const POINTS_KEY: Record<string, keyof ISeasonPersonStats['points']> = {
  ATTENDANCE: 'attendance',
  ACTIVITY: 'activity',
  REFERRAL_BONUS: 'referrals',
  REFERRAL_WELCOME: 'referrals',
  FORM_RESPONSE: 'forms',
  BIRTHDAY: 'birthday',
  BONUS: 'bonus',
};

/** Cifras de cada premiado para el resumen, y los días con asistencia */
const computeStats = async (
  season: Pick<ISeasonDocument, '_id' | 'startDate' | 'endDate'>,
  youngIds: string[]
) => {
  const seasonId = new mongoose.Types.ObjectId(String(season._id));
  const ids = youngIds.map(id => new mongoose.Types.ObjectId(id));

  const [rows, streaks, dates] = await Promise.all([
    PointsTransaction.aggregate([
      { $match: { seasonId, youngId: { $in: ids } } },
      {
        $group: {
          _id: { youngId: '$youngId', type: '$type' },
          points: { $sum: '$points' },
          count: { $sum: 1 },
          early: {
            $sum: { $cond: [{ $gt: ['$speedBonus', 0] }, 1, 0] },
          },
          earlyPoints: { $sum: { $ifNull: ['$speedBonus', 0] } },
        },
      },
    ]),
    Streak.find({ seasonId, youngId: { $in: ids } }).lean(),
    Attendance.distinct('attendanceDate', {
      attendanceDate: {
        $gte: formatDateColombia(season.startDate),
        $lte: formatDateColombia(season.endDate),
      },
    }),
  ]);

  const byId = new Map(youngIds.map(id => [id, emptyStats()]));

  for (const row of rows as any[]) {
    const stats = byId.get(String(row._id.youngId));
    if (!stats) continue;
    const { type } = row._id;
    stats.totalPoints += row.points;
    const key = POINTS_KEY[type];
    if (key) stats.points[key] += row.points;
    if (type === 'ATTENDANCE') {
      stats.attendanceCount = row.count;
      stats.earlyArrivals = row.early;
      stats.earlyPoints = row.earlyPoints;
    }
    if (type === 'ACTIVITY') stats.activities = row.count;
    if (type === 'REFERRAL_BONUS') stats.referrals = row.count;
    if (type === 'FORM_RESPONSE') stats.forms = row.count;
  }

  for (const streak of streaks as any[]) {
    const stats = byId.get(String(streak.youngId));
    if (!stats) continue;
    stats.bestStreakWeeks = streak.bestStreakWeeks;
    stats.streakBonus = !!streak.violetFlameAwarded;
  }

  const totalDays = Math.max(
    dates.length,
    ...[...byId.values()].map(s => s.attendanceCount)
  );
  byId.forEach(stats => {
    stats.attendancePercent = totalDays
      ? Math.round((stats.attendanceCount / totalDays) * 100)
      : 0;
  });

  return { byId, totalDays };
};

export const computeSeasonResults = async (
  season: Pick<ISeasonDocument, '_id' | 'startDate' | 'endDate'>
): Promise<Omit<ISeasonResults, 'finalizedAt' | 'finalizedBy'>> => {
  const seasonId = String(season._id);
  // Mismo filtro de elegibilidad y mismo orden que muestra el ranking
  const ranking: any[] = await pointsService.getLeaderboard({ seasonId });

  const podium = ranking.slice(0, 3).map((entry, index) => ({
    place: index + 1,
    youngId: entry.youngId,
    name: entry.youngName,
    profileImage: entry.profileImage,
    totalPoints: entry.totalPoints,
    streak: entry.streak || 0,
  }));

  const constancy = await computeConstancy(
    seasonId,
    podium[0] && String(podium[0].youngId)
  );

  const { byId, totalDays } = await computeStats(season, [
    ...new Set(
      [...podium, ...constancy.winners].map(p => String(p.youngId))
    ),
  ]);
  const withStats = <T extends { youngId: unknown }>(person: T) => ({
    ...person,
    stats: byId.get(String(person.youngId)),
  });

  return {
    totalParticipants: ranking.length,
    totalDays,
    podium: podium.map(withStats),
    constancy: {
      ...constancy,
      winners: constancy.winners.map(withStats),
    },
  };
};

const toDTO = (season: ISeasonDocument): SeasonResultsDTO => {
  const json: any = season.toJSON();
  const results = { ...json.results };
  delete results.finalizedBy; // dato interno, no se expone
  return {
    season: {
      id: String(season._id),
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
    },
    results,
  };
};

/**
 * Finaliza una temporada y congela su resultado en un solo guardado.
 * Idempotente: si ya tiene resultado, no se recalcula.
 */
export const finalizeSeason = async (
  seasonId: string,
  userId?: string
): Promise<ISeasonDocument> => {
  const season = await Season.findById(seasonId).select('+results');
  if (!season) {
    throw new Error('La temporada especificada no existe.');
  }
  if (season.status === 'COMPLETED' && season.results) {
    return season;
  }

  // Temporadas cerradas antes de existir la premiación: se fechan en su último
  // cambio para que no aparezcan como recién terminadas.
  const finalizedAt =
    season.status === 'COMPLETED'
      ? season.updatedAt || season.endDate
      : new Date();

  const computed = await computeSeasonResults(season);

  season.status = 'COMPLETED';
  season.results = { ...computed, finalizedAt, finalizedBy: userId };
  await season.save();

  return season;
};

/** Resultados de una temporada finalizada; null si no existe o sigue abierta */
export const getSeasonResults = async (
  seasonId: string
): Promise<SeasonResultsDTO | null> => {
  const season = await Season.findById(seasonId).select('+results');
  if (!season || season.status !== 'COMPLETED') return null;

  return toDTO(season.results ? season : await finalizeSeason(seasonId));
};

export const getLatestSeasonResults =
  async (): Promise<SeasonResultsDTO | null> => {
    const season = await Season.findOne({
      status: 'COMPLETED',
      'results.finalizedAt': { $exists: true },
    })
      .sort({ 'results.finalizedAt': -1 })
      .select('+results');

    return season ? toDTO(season) : null;
  };
