jest.mock('../models/QRCode');
jest.mock('../models/Attendance');
jest.mock('../models/Young');
jest.mock('./pointsService', () => ({
  pointsService: {
    assignAttendancePoints: jest.fn(),
    getTotalPoints: jest.fn(),
  },
}));

import QRCodeModel from '../models/QRCode';
import AttendanceModel from '../models/Attendance';
import Young from '../models/Young';
import { pointsService } from './pointsService';
import { registerAttendanceCore } from './attendanceService';

const mockedAttendance = AttendanceModel as jest.Mocked<typeof AttendanceModel>;
const mockedQRCode = QRCodeModel as jest.Mocked<typeof QRCodeModel>;
const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedPointsService = pointsService as jest.Mocked<typeof pointsService>;

const YOUNG_ID = '507f1f77bcf86cd799439012';

const makeQrCode = (overrides: Record<string, any> = {}) => ({
  _id: 'qr1',
  points: 10,
  generatedAt: new Date(Date.now() - 5000),
  getCurrentSpeedBonus: () => 3,
  ...overrides,
});

describe('attendanceService.registerAttendanceCore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza ALREADY_REGISTERED si el joven ya registró asistencia hoy', async () => {
    mockedAttendance.findOne.mockResolvedValue({ _id: 'existing' } as any);

    await expect(
      registerAttendanceCore(YOUNG_ID, makeQrCode())
    ).rejects.toThrow('ALREADY_REGISTERED');
  });

  it('registra la asistencia, incrementa el uso del QR y asigna puntos', async () => {
    mockedAttendance.findOne.mockResolvedValue(null);
    const save = jest.fn().mockResolvedValue(undefined);
    const scannedAt = new Date();
    (mockedAttendance as any).mockImplementation((data: any) => ({
      ...data,
      scannedAt,
      save,
    }));
    mockedQRCode.findByIdAndUpdate.mockResolvedValue({} as any);
    mockedPointsService.assignAttendancePoints.mockResolvedValue({
      points: 13,
      description: 'Asistencia registrada',
    } as any);
    mockedPointsService.getTotalPoints.mockResolvedValue(50);
    mockedYoung.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ fullName: 'Ana', placa: '@MODANA001' }),
    } as any);

    const qrCode = makeQrCode();
    const result = await registerAttendanceCore(YOUNG_ID, qrCode, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(save).toHaveBeenCalled();
    expect(mockedQRCode.findByIdAndUpdate).toHaveBeenCalledWith('qr1', {
      $inc: { usageCount: 1 },
    });
    expect(mockedPointsService.assignAttendancePoints).toHaveBeenCalledWith(
      YOUNG_ID,
      'qr1',
      13, // basePoints (10) + speedBonus (3)
      3,
      expect.any(Number)
    );
    expect(result.points).toEqual(
      expect.objectContaining({ earned: 13, basePoints: 10, speedBonus: 3, total: 50 })
    );
    expect(result.young).toEqual({ fullName: 'Ana', placa: '@MODANA001' });
  });

  it('no falla el registro de asistencia si la asignación de puntos lanza error', async () => {
    mockedAttendance.findOne.mockResolvedValue(null);
    const save = jest.fn().mockResolvedValue(undefined);
    (mockedAttendance as any).mockImplementation((data: any) => ({
      ...data,
      scannedAt: new Date(),
      save,
    }));
    mockedQRCode.findByIdAndUpdate.mockResolvedValue({} as any);
    mockedPointsService.assignAttendancePoints.mockRejectedValue(
      new Error('Ya se asignaron puntos por esta asistencia.')
    );
    mockedYoung.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ fullName: 'Ana' }),
    } as any);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await registerAttendanceCore(YOUNG_ID, makeQrCode());

    expect(result.points).toBeNull();
    expect(result.attendance).toBeDefined();
  });
});
