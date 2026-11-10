jest.mock('../models/Young');
jest.mock('../models/Season');
jest.mock('./emailService', () => ({
  emailService: {
    isConfigured: jest.fn().mockReturnValue(true),
    sendEmailOrThrow: jest.fn().mockResolvedValue(undefined),
    getProviderName: jest.fn().mockReturnValue('Gmail'),
  },
}));

import Young from '../models/Young';
import Season from '../models/Season';
import { emailService } from './emailService';
import env from '../config/env';
import {
  sendPendingBirthdayCards,
  buildBirthdayCtaUrl,
} from './birthdayEmailService';

const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedSeason = Season as jest.Mocked<typeof Season>;
const mockedSend = emailService.sendEmailOrThrow as jest.Mock;
const mockedConfigured = emailService.isConfigured as jest.Mock;

const thisYear = new Date().getFullYear();

const makeYoung = (overrides: Record<string, unknown> = {}) => ({
  _id: 'y1',
  fullName: 'Valentina Pérez',
  email: 'vale@example.com',
  placa: '@MODVALE001',
  profileImage: 'https://res.cloudinary.com/demo/image/upload/v1/vale.jpg',
  group: 1,
  birthday: new Date(2000, 5, 15),
  birthdayPointsClaimed: new Date(thisYear, 5, 15, 6, 0),
  birthdayEmailSentAt: null,
  isBirthdayToday: () => true,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedConfigured.mockReturnValue(true);
  mockedSeason.findOne.mockResolvedValue({
    settings: { birthdayBonusPoints: 100 },
  } as any);
  mockedYoung.updateOne.mockResolvedValue({} as any);
});

describe('buildBirthdayCtaUrl', () => {
  it('prellena la placa codificada en /login', () => {
    expect(buildBirthdayCtaUrl('@MODVALE001')).toBe(
      `${env.frontendUrl}/login?placa=%40MODVALE001`
    );
  });

  it('sin placa apunta a /login', () => {
    expect(buildBirthdayCtaUrl(null)).toBe(`${env.frontendUrl}/login`);
  });
});

describe('sendPendingBirthdayCards', () => {
  it('no hace nada si el email no está configurado', async () => {
    mockedConfigured.mockReturnValue(false);
    const result = await sendPendingBirthdayCards();
    expect(result).toEqual({ processed: 0, sent: 0, skipped: 0, failed: [] });
    expect(mockedYoung.find).not.toHaveBeenCalled();
  });

  it('filtra grupo 1 con email, activos y con puntos del año', async () => {
    mockedYoung.find.mockResolvedValue([] as any);
    await sendPendingBirthdayCards();
    const filter = (mockedYoung.find.mock.calls as any[])[0][0];
    expect(filter.group).toBe(1);
    expect(filter.email).toEqual({ $nin: [null, ''] });
    expect(filter.deletedAt).toBeNull();
    expect(filter.isSpam).toEqual({ $ne: true });
    expect(filter.birthdayPointsClaimed.$gte.getFullYear()).toBe(thisYear);
  });

  it('reserva antes de enviar y envía la tarjeta con placa y puntos de la temporada', async () => {
    mockedSeason.findOne.mockResolvedValue({
      settings: { birthdayBonusPoints: 150 },
    } as any);
    mockedYoung.find.mockResolvedValue([makeYoung()] as any);
    mockedYoung.findOneAndUpdate.mockResolvedValue(makeYoung() as any);

    const result = await sendPendingBirthdayCards();

    expect(result).toEqual({ processed: 1, sent: 1, skipped: 0, failed: [] });
    expect(mockedYoung.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'y1',
        $or: [
          { birthdayEmailSentAt: null },
          { birthdayEmailSentAt: { $lt: expect.any(Date) } },
        ],
      }),
      { $set: { birthdayEmailSentAt: expect.any(Date) } }
    );
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'birthday',
        toEmail: 'vale@example.com',
        toName: 'Valentina Pérez',
        placa: '@MODVALE001',
        profileImage: 'https://res.cloudinary.com/demo/image/upload/v1/vale.jpg',
        birthdayPoints: 150,
        birthdayCtaUrl: `${env.frontendUrl}/login?placa=%40MODVALE001`,
      })
    );
    expect(mockedYoung.updateOne).not.toHaveBeenCalled();
  });

  it('salta a quien ya recibió la tarjeta este año (reserva no hace match)', async () => {
    mockedYoung.find.mockResolvedValue([makeYoung()] as any);
    mockedYoung.findOneAndUpdate.mockResolvedValue(null as any);

    const result = await sendPendingBirthdayCards();

    expect(result).toEqual({ processed: 1, sent: 0, skipped: 1, failed: [] });
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('ignora a quien no cumple años hoy', async () => {
    mockedYoung.find.mockResolvedValue([
      makeYoung({ isBirthdayToday: () => false }),
    ] as any);

    const result = await sendPendingBirthdayCards();

    expect(result.processed).toBe(0);
    expect(mockedYoung.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('si el envío falla revierte la reserva y registra el fallo sin lanzar', async () => {
    const lastYear = new Date(thisYear - 1, 5, 15);
    mockedYoung.find.mockResolvedValue([
      makeYoung({ birthdayEmailSentAt: lastYear }),
    ] as any);
    mockedYoung.findOneAndUpdate.mockResolvedValue(makeYoung() as any);
    mockedSend.mockRejectedValueOnce(new Error('Gmail error: SMTP timeout'));

    const result = await sendPendingBirthdayCards();

    expect(result.sent).toBe(0);
    expect(result.failed).toEqual([
      { youngId: 'y1', message: 'Gmail error: SMTP timeout' },
    ]);
    expect(mockedYoung.updateOne).toHaveBeenCalledWith(
      { _id: 'y1' },
      { $set: { birthdayEmailSentAt: lastYear } }
    );
  });

  it('un fallo en un joven no impide enviar a los demás', async () => {
    mockedYoung.find.mockResolvedValue([
      makeYoung({ _id: 'y1' }),
      makeYoung({ _id: 'y2', email: 'otro@example.com' }),
    ] as any);
    mockedYoung.findOneAndUpdate.mockResolvedValue(makeYoung() as any);
    mockedSend
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce(undefined);

    const result = await sendPendingBirthdayCards();

    expect(result.sent).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(mockedSend).toHaveBeenCalledTimes(2);
  });
});
