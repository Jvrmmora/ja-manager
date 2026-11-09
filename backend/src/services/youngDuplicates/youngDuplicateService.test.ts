jest.mock('../../models/Young');
jest.mock('../../models/YoungDuplicateDismissal');
jest.mock('../../models/PointsTransaction');
jest.mock('../../models/Attendance');
jest.mock('../../models/Streak');
jest.mock('../../models/FormResponse');
jest.mock('../../models/Form');
jest.mock('../../models/ConsentRecord');
jest.mock('../../models/LeaderboardSnapshot');
jest.mock('../../models/QRCode');
jest.mock('../../models/RegistrationRequest');

import Young from '../../models/Young';
import YoungDuplicateDismissal from '../../models/YoungDuplicateDismissal';
import PointsTransaction from '../../models/PointsTransaction';
import Attendance from '../../models/Attendance';
import { dismissPair, listDuplicatePairs, previewMerge } from './youngDuplicateService';

const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedDismissal = YoungDuplicateDismissal as jest.Mocked<typeof YoungDuplicateDismissal>;

const A = '64b7f0f0f0f0f0f0f0f0f0a1';
const B = '64b7f0f0f0f0f0f0f0f0f0b2';
const C = '64b7f0f0f0f0f0f0f0f0f0c3';

const chain = (value: unknown) => {
  const query: any = {
    select: jest.fn(() => query),
    session: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(value),
  };
  return query;
};

const pedroOld = { _id: A, fullName: 'Pedro Ramirez', birthday: new Date('2025-03-14'), createdAt: new Date('2025-07-01'), password: 'hash', first_login: true };
const pedroNew = {
  _id: B,
  fullName: 'Pedro Antonio Ramírez Soto',
  birthday: new Date('1998-03-14'),
  email: 'pedro@x.com',
  phone: '3001112233',
  createdAt: new Date('2026-11-01'),
  password: 'hash2',
  dataConsent: { status: 'current' },
};
const other = { _id: C, fullName: 'Lina Torres', birthday: new Date('1999-08-01'), createdAt: new Date('2025-01-01') };

beforeEach(() => {
  jest.clearAllMocks();
  (mockedDismissal.find as jest.Mock).mockReturnValue(chain([]));
  (PointsTransaction.aggregate as jest.Mock).mockResolvedValue([{ _id: A, total: 120 }]);
  (Attendance.aggregate as jest.Mock).mockResolvedValue([{ _id: A, total: 3 }]);
});

describe('listDuplicatePairs', () => {
  it('propone el par, con actividad y cuenta sugerida, sin exponer contraseñas', async () => {
    (mockedYoung.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([pedroOld, pedroNew, other]) });

    const pairs = await listDuplicatePairs();

    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({ level: 'high', suggestedTargetId: B });
    expect(pairs[0].a).toMatchObject({ id: A, points: 120, attendances: 3, hasPassword: true });
    expect(JSON.stringify(pairs)).not.toContain('hash');
  });

  it('solo busca entre jóvenes activos', async () => {
    (mockedYoung.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    await listDuplicatePairs();
    expect(mockedYoung.find).toHaveBeenCalledWith({ deletedAt: null, isSpam: { $ne: true } });
  });

  it('no vuelve a proponer un par descartado', async () => {
    (mockedYoung.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([pedroOld, pedroNew]) });
    (mockedDismissal.find as jest.Mock).mockReturnValue(chain([{ pairKey: [A, B].sort().join(':') }]));
    expect(await listDuplicatePairs()).toEqual([]);
  });

  it('ordena primero las coincidencias fuertes', async () => {
    const juanShort = { _id: '64b7f0f0f0f0f0f0f0f0f0d1', fullName: 'Juan David', createdAt: new Date('2026-12-01') };
    const juanLong = { _id: '64b7f0f0f0f0f0f0f0f0f0d2', fullName: 'Juan David Mateus', createdAt: new Date('2026-12-02') };
    (PointsTransaction.aggregate as jest.Mock).mockResolvedValue([]);
    (Attendance.aggregate as jest.Mock).mockResolvedValue([]);
    (mockedYoung.find as jest.Mock).mockReturnValue({ lean: jest.fn().mockResolvedValue([juanShort, juanLong, pedroOld, pedroNew]) });
    const pairs = await listDuplicatePairs();
    expect(pairs.map(p => p.level)).toEqual(['high', 'medium']);
  });
});

describe('dismissPair', () => {
  it('guarda el par sin importar el orden y es idempotente', async () => {
    (mockedDismissal.updateOne as jest.Mock).mockResolvedValue({});
    await dismissPair(B, A, 'admin-sin-objectid');
    const [filter, update, options] = (mockedDismissal.updateOne as jest.Mock).mock.calls[0];
    expect(filter).toEqual({ pairKey: [A, B].sort().join(':') });
    expect(update.$setOnInsert.dismissedBy).toBeUndefined();
    expect(options).toEqual({ upsert: true });
  });

  it('rechaza el mismo joven dos veces', async () => {
    await expect(dismissPair(A, A, 'admin')).rejects.toThrow(/distintos/);
  });
});

describe('previewMerge: validaciones', () => {
  it('no permite fusionar a alguien consigo mismo', async () => {
    await expect(previewMerge(A, A)).rejects.toThrow(/distintos/);
  });

  it('exige que ambas cuentas estén activas', async () => {
    (mockedYoung.findOne as jest.Mock).mockReturnValueOnce(chain(pedroOld)).mockReturnValueOnce(chain(null));
    await expect(previewMerge(A, B)).rejects.toThrow(/no encontrado/);
  });

  it('nunca da de baja una cuenta de administrador', async () => {
    (mockedYoung.findOne as jest.Mock)
      .mockReturnValueOnce(chain({ ...pedroOld, role_name: 'Super Admin' }))
      .mockReturnValueOnce(chain(pedroNew));
    await expect(previewMerge(A, B)).rejects.toThrow(/administrador/);
  });
});
