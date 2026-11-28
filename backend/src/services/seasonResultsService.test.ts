jest.mock('../models/Season');
jest.mock('../models/PointsTransaction');
jest.mock('../models/Streak');
jest.mock('../models/Attendance');
jest.mock('./pointsService', () => ({
  pointsService: { getLeaderboard: jest.fn() },
  RANKING_ELIGIBLE_MATCH: { 'young.group': 1 },
}));

import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import Streak from '../models/Streak';
import Attendance from '../models/Attendance';
import { pointsService } from './pointsService';
import {
  computeSeasonResults,
  finalizeSeason,
  getSeasonResults,
} from './seasonResultsService';

const SEASON_ID = '507f1f77bcf86cd799439011';
const season = {
  _id: SEASON_ID,
  startDate: new Date('2026-01-01T12:00:00Z'),
  endDate: new Date('2026-03-01T12:00:00Z'),
} as any;
// Los ids del ranking deben ser ObjectId válidos
const oid = (n: number | string) => String(n).padStart(24, '0');
const getLeaderboard = pointsService.getLeaderboard as jest.Mock;
const streakAggregate = Streak.aggregate as jest.Mock;
const txAggregate = PointsTransaction.aggregate as jest.Mock;
const findById = Season.findById as jest.Mock;

const entry = (n: number) => ({
  youngId: oid(n),
  youngName: `Joven ${n}`,
  totalPoints: 100 - n,
  streak: n,
});
const streakRow = (id: string, weeks: number) => ({
  youngId: oid(id),
  name: `Nombre ${id}`,
  bestStreakWeeks: weeks,
});

const seasonDoc = (extra: Record<string, unknown> = {}) => {
  const doc: any = {
    ...season,
    name: 'Temporada',
    status: 'ACTIVE',
    save: jest.fn().mockResolvedValue(undefined),
    ...extra,
  };
  doc.toJSON = () => ({ results: doc.results });
  return doc;
};
const mockFind = (doc: unknown) =>
  findById.mockReturnValue({ select: jest.fn().mockResolvedValue(doc) });

beforeEach(() => {
  jest.resetAllMocks();
  getLeaderboard.mockResolvedValue([1, 2, 3, 4].map(entry));
  streakAggregate.mockResolvedValue([]);
  txAggregate.mockResolvedValue([]);
  (Streak.find as jest.Mock).mockReturnValue({
    lean: jest.fn().mockResolvedValue([]),
  });
  (Attendance.distinct as jest.Mock).mockResolvedValue([]);
});

describe('computeSeasonResults', () => {
  it('toma los tres primeros en el orden del ranking', async () => {
    const results = await computeSeasonResults(season);

    expect(results.totalParticipants).toBe(4);
    expect(results.podium.map(p => [p.place, p.youngId])).toEqual([
      [1, oid(1)],
      [2, oid(2)],
      [3, oid(3)],
    ]);
  });

  it('permite un podio incompleto', async () => {
    getLeaderboard.mockResolvedValue([entry(1)]);

    expect((await computeSeasonResults(season)).podium).toHaveLength(1);
  });

  it('premia a uno solo: en empate de racha gana quien más asistió', async () => {
    streakAggregate.mockResolvedValue([
      streakRow('a', 6),
      streakRow('b', 6),
      streakRow('c', 5),
    ]);
    txAggregate.mockResolvedValue([
      { _id: oid('a'), total: 7 },
      { _id: oid('b'), total: 9 },
    ]);

    const { constancy } = await computeSeasonResults(season);

    expect(constancy.bestStreakWeeks).toBe(6);
    expect(constancy.winners.map(w => [w.youngId, w.attendanceCount])).toEqual([
      [oid('b'), 9],
    ]);
  });

  it('excluye al primer puesto y toma la siguiente mejor racha', async () => {
    streakAggregate.mockResolvedValue([
      streakRow('1', 7), // campeón del podio
      streakRow('2', 5),
    ]);

    const { constancy } = await computeSeasonResults(season);

    expect(constancy.bestStreakWeeks).toBe(5);
    expect(constancy.winners.map(w => w.youngId)).toEqual([oid(2)]);
  });

  it('no hay ganadores de constancia sin rachas', async () => {
    const { constancy } = await computeSeasonResults(season);

    expect(constancy).toEqual({ bestStreakWeeks: 0, winners: [] });
  });

  it('arma las cifras del resumen de cada premiado', async () => {
    const row = (type: string, points: number, count: number, early = 0) => ({
      _id: { youngId: oid(1), type },
      points,
      count,
      early,
      earlyPoints: early * 5,
    });
    txAggregate.mockResolvedValue([
      row('ATTENDANCE', 130, 3, 2),
      row('REFERRAL_BONUS', 60, 2),
      row('REFERRAL_WELCOME', 10, 1),
    ]);
    (Streak.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { youngId: oid(1), bestStreakWeeks: 4, violetFlameAwarded: true },
      ]),
    });
    (Attendance.distinct as jest.Mock).mockResolvedValue(['a', 'b', 'c', 'd']);

    const results = await computeSeasonResults(season);

    expect(results.totalDays).toBe(4);
    expect(results.podium[0].stats).toMatchObject({
      attendanceCount: 3,
      attendancePercent: 75,
      bestStreakWeeks: 4,
      totalPoints: 200,
      points: { attendance: 130, referrals: 70 },
      referrals: 2,
      earlyArrivals: 2,
      earlyPoints: 10,
      streakBonus: true,
    });
  });
});

describe('finalizeSeason', () => {
  it('marca la temporada como finalizada y congela el resultado', async () => {
    const doc = seasonDoc();
    mockFind(doc);

    await finalizeSeason(SEASON_ID, 'admin');

    expect(doc.status).toBe('COMPLETED');
    expect(doc.results.finalizedBy).toBe('admin');
    expect(doc.results.podium).toHaveLength(3);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });

  it('no recalcula un resultado ya congelado', async () => {
    const doc = seasonDoc({ status: 'COMPLETED', results: { podium: [] } });
    mockFind(doc);

    await finalizeSeason(SEASON_ID);

    expect(getLeaderboard).not.toHaveBeenCalled();
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('getSeasonResults', () => {
  it('devuelve null si la temporada no ha finalizado', async () => {
    mockFind(seasonDoc());

    expect(await getSeasonResults(SEASON_ID)).toBeNull();
  });

  it('calcula una vez los resultados de temporadas antiguas', async () => {
    const updatedAt = new Date('2026-01-10T00:00:00Z');
    const doc = seasonDoc({ status: 'COMPLETED', updatedAt });
    mockFind(doc);

    const data = await getSeasonResults(SEASON_ID);

    expect(data?.results.finalizedAt).toBe(updatedAt);
    expect(doc.save).toHaveBeenCalledTimes(1);
  });
});
