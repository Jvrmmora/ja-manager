jest.mock('../models/Season');
jest.mock('../models/PointsTransaction');
jest.mock('../models/Streak');
jest.mock('../services/seasonResultsService');

import Season from '../models/Season';
import PointsTransaction from '../models/PointsTransaction';
import Streak from '../models/Streak';
import { finalizeSeason } from '../services/seasonResultsService';
import { activateSeason, deleteSeason, updateSeason } from './seasonController';

const ID = '507f1f77bcf86cd799439011';

const run = async (handler: any, body: object = {}) => {
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  await handler({ params: { id: ID }, body }, res, next);
  expect(next).not.toHaveBeenCalled();
  return res.status.mock.calls[0][0];
};

const seasonDoc = (status: string): any => ({
  _id: ID,
  status,
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-03-01'),
  save: jest.fn(),
  activate: jest.fn(),
  deleteOne: jest.fn(),
  toJSON: () => ({}),
});

const mockSeason = (doc: unknown) =>
  (Season.findById as jest.Mock).mockResolvedValue(doc);

beforeEach(() => jest.resetAllMocks());

describe('deleteSeason', () => {
  it.each(['ACTIVE', 'COMPLETED'])('no borra temporadas %s', async status => {
    const doc = seasonDoc(status);
    mockSeason(doc);

    expect(await run(deleteSeason)).toBe(409);
    expect(doc.deleteOne).not.toHaveBeenCalled();
  });

  it('no borra una temporada próxima que ya tiene puntos', async () => {
    const doc = seasonDoc('UPCOMING');
    mockSeason(doc);
    (PointsTransaction.exists as jest.Mock).mockResolvedValue({ _id: 'tx' });

    expect(await run(deleteSeason)).toBe(409);
    expect(doc.deleteOne).not.toHaveBeenCalled();
  });

  it('borra una temporada próxima vacía', async () => {
    const doc = seasonDoc('UPCOMING');
    mockSeason(doc);
    (PointsTransaction.exists as jest.Mock).mockResolvedValue(null);
    (Streak.exists as jest.Mock).mockResolvedValue(null);

    expect(await run(deleteSeason)).toBe(200);
    expect(doc.deleteOne).toHaveBeenCalled();
  });
});

describe('activateSeason', () => {
  it('no reactiva una temporada finalizada', async () => {
    const doc = seasonDoc('COMPLETED');
    mockSeason(doc);

    expect(await run(activateSeason)).toBe(409);
    expect(doc.activate).not.toHaveBeenCalled();
  });

  it('finaliza la temporada activa antes de activar otra', async () => {
    const doc = seasonDoc('UPCOMING');
    mockSeason(doc);
    (Season.find as jest.Mock).mockResolvedValue([{ _id: 'anterior' }]);

    expect(await run(activateSeason)).toBe(200);
    expect(finalizeSeason).toHaveBeenCalledWith('anterior', undefined);
    expect(doc.activate).toHaveBeenCalled();
  });
});

describe('updateSeason', () => {
  it('ignora el estado y los resultados del body', async () => {
    const doc = seasonDoc('UPCOMING');
    mockSeason(doc);

    expect(
      await run(updateSeason, { name: 'Nueva', status: 'ACTIVE', results: {} })
    ).toBe(200);
    expect(doc.name).toBe('Nueva');
    expect(doc.status).toBe('UPCOMING');
    expect(doc.results).toBeUndefined();
  });
});
