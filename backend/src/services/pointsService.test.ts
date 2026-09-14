jest.mock('../models/PointsTransaction');
jest.mock('../models/Season');
jest.mock('../models/Attendance');
jest.mock('../models/Streak');
jest.mock('../models/Young');
jest.mock('./streakService');

import PointsTransaction from '../models/PointsTransaction';
import Season from '../models/Season';
import Young from '../models/Young';
import { updateStreakOnAttendance } from './streakService';
import { pointsService } from './pointsService';

const mockedPointsTransaction = PointsTransaction as jest.Mocked<
  typeof PointsTransaction
>;
const mockedSeason = Season as jest.Mocked<typeof Season>;
const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedUpdateStreak = updateStreakOnAttendance as jest.Mock;

const ACTIVE_SEASON_ID = '507f1f77bcf86cd799439011';
const activeSeason = {
  _id: ACTIVE_SEASON_ID,
  settings: {
    attendancePoints: 10,
    referralBonusPoints: 30,
    referralWelcomePoints: 15,
    birthdayBonusPoints: 100,
  },
};

describe('pointsService.createTransaction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('usa la temporada activa cuando no se especifica seasonId', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedSeason.findById.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.create.mockResolvedValue({
      points: 10,
    } as any);

    await pointsService.createTransaction({
      youngId: 'young1',
      points: 10,
      type: 'ACTIVITY',
    });

    expect(mockedSeason.findOne).toHaveBeenCalledWith({ status: 'ACTIVE' });
    expect(mockedPointsTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ seasonId: ACTIVE_SEASON_ID, points: 10 })
    );
  });

  it('lanza error si no hay temporada activa y no se especifica seasonId', async () => {
    mockedSeason.findOne.mockResolvedValue(null);

    await expect(
      pointsService.createTransaction({
        youngId: 'young1',
        points: 10,
        type: 'ACTIVITY',
      })
    ).rejects.toThrow('No hay temporada activa');
  });

  it('lanza error si la temporada especificada no existe', async () => {
    mockedSeason.findById.mockResolvedValue(null);

    await expect(
      pointsService.createTransaction({
        youngId: 'young1',
        seasonId: ACTIVE_SEASON_ID,
        points: 10,
        type: 'ACTIVITY',
      })
    ).rejects.toThrow('La temporada especificada no existe');
  });
});

describe('pointsService.assignAttendancePoints', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza error si ya existe una transacción de asistencia para ese evento', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.findOne.mockResolvedValue({ _id: 'existing' } as any);

    await expect(
      pointsService.assignAttendancePoints(
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439013'
      )
    ).rejects.toThrow('Ya se asignaron puntos por esta asistencia.');
  });

  it('crea la transacción de asistencia y actualiza la racha', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedSeason.findById.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.findOne.mockResolvedValue(null);
    mockedPointsTransaction.create.mockResolvedValue({
      _id: 'tx1',
      points: 15,
      description: 'Asistencia registrada',
    } as any);
    mockedPointsTransaction.findByIdAndUpdate.mockResolvedValue({} as any);
    mockedUpdateStreak.mockResolvedValue({ awardVioletFlame: false });

    const result = await pointsService.assignAttendancePoints(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013',
      15,
      5,
      120
    );

    expect(mockedPointsTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ points: 15, type: 'ATTENDANCE' })
    );
    expect(mockedUpdateStreak).toHaveBeenCalled();
    expect(result.points).toBe(15);
  });

  it('otorga el bonus de Llama Violeta cuando la racha lo indica', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedSeason.findById.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.findOne.mockResolvedValue(null);
    mockedPointsTransaction.create.mockResolvedValue({
      _id: 'tx1',
      points: 10,
      description: 'Asistencia registrada',
    } as any);
    mockedUpdateStreak.mockResolvedValue({ awardVioletFlame: true });

    await pointsService.assignAttendancePoints(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013'
    );

    expect(mockedPointsTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BONUS', points: 100 })
    );
  });

  it('no bloquea la asistencia si actualizar la racha falla', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedSeason.findById.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.findOne.mockResolvedValue(null);
    mockedPointsTransaction.create.mockResolvedValue({
      _id: 'tx1',
      points: 10,
      description: 'Asistencia registrada',
    } as any);
    mockedUpdateStreak.mockRejectedValue(new Error('boom'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await pointsService.assignAttendancePoints(
      '507f1f77bcf86cd799439012',
      '507f1f77bcf86cd799439013'
    );

    expect(result.points).toBe(10);
  });
});

describe('pointsService.assignReferralPoints', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna null si no hay temporada activa', async () => {
    mockedSeason.findOne.mockResolvedValue(null);

    const result = await pointsService.assignReferralPoints('ref1', 'new1');

    expect(result).toBeNull();
    expect(mockedPointsTransaction.create).not.toHaveBeenCalled();
  });

  it('crea transacción de bonus para el referidor y de bienvenida para el nuevo joven', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedSeason.findById.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.create
      .mockResolvedValueOnce({ points: 30, type: 'REFERRAL_BONUS' } as any)
      .mockResolvedValueOnce({ points: 15, type: 'REFERRAL_WELCOME' } as any);

    const result = await pointsService.assignReferralPoints('ref1', 'new1');

    expect(result?.bonusTransaction.points).toBe(30);
    expect(result?.welcomeTransaction.points).toBe(15);
  });
});

describe('pointsService.getTotalPoints', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 0 si no hay temporada activa ni seasonId', async () => {
    mockedSeason.findOne.mockResolvedValue(null);

    const total = await pointsService.getTotalPoints('young1');

    expect(total).toBe(0);
  });

  it('delega en PointsTransaction.calculateTotalPoints', async () => {
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    (mockedPointsTransaction as any).calculateTotalPoints = jest
      .fn()
      .mockResolvedValue(42);

    const total = await pointsService.getTotalPoints('young1');

    expect(total).toBe(42);
    expect((mockedPointsTransaction as any).calculateTotalPoints).toHaveBeenCalledWith(
      'young1',
      ACTIVE_SEASON_ID
    );
  });
});

describe('pointsService.deleteTransaction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza error si la transacción no existe', async () => {
    mockedPointsTransaction.findById.mockResolvedValue(null);

    await expect(pointsService.deleteTransaction('tx1')).rejects.toThrow(
      'Transacción no encontrada.'
    );
  });

  it('elimina la transacción encontrada', async () => {
    const deleteOne = jest.fn().mockResolvedValue(undefined);
    mockedPointsTransaction.findById.mockResolvedValue({
      deleteOne,
    } as any);

    await pointsService.deleteTransaction('tx1');

    expect(deleteOne).toHaveBeenCalled();
  });
});

describe('pointsService.claimBirthdayPoints', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza error si el joven no existe', async () => {
    mockedYoung.findById.mockResolvedValue(null);

    await expect(pointsService.claimBirthdayPoints('young1')).rejects.toThrow(
      'Joven no encontrado'
    );
  });

  it('lanza error si el joven no tiene cumpleaños registrado', async () => {
    mockedYoung.findById.mockResolvedValue({ birthday: null } as any);

    await expect(pointsService.claimBirthdayPoints('young1')).rejects.toThrow(
      'El joven no tiene fecha de cumpleaños registrada'
    );
  });

  it('lanza error si ya reclamó los puntos este año', async () => {
    const now = new Date();
    mockedYoung.findById.mockResolvedValue({
      birthday: now,
      birthdayPointsClaimed: now,
    } as any);
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);

    await expect(pointsService.claimBirthdayPoints('young1')).rejects.toThrow(
      'Ya reclamaste tus puntos de cumpleaños este año'
    );
  });

  it('registra los puntos de cumpleaños cuando está dentro de la ventana', async () => {
    const today = new Date();
    const save = jest.fn().mockResolvedValue(undefined);
    const young: any = {
      _id: 'young1',
      fullName: 'Ana',
      birthday: today,
      birthdayPointsClaimed: null,
      save,
    };
    mockedYoung.findById.mockResolvedValue(young);
    mockedSeason.findOne.mockResolvedValue(activeSeason as any);
    mockedPointsTransaction.create.mockResolvedValue({} as any);

    const result = await pointsService.claimBirthdayPoints('young1');

    expect(result.success).toBe(true);
    expect(result.points).toBe(100);
    expect(save).toHaveBeenCalled();
    expect(young.birthdayPointsClaimed).toBeInstanceOf(Date);
  });
});
