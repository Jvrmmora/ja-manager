jest.mock('../models/Young');
jest.mock('../models/PasswordReset');
jest.mock('./emailService', () => ({
  emailService: {
    isConfigured: jest.fn().mockReturnValue(true),
    sendEmailOrThrow: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
  },
}));

import mongoose from 'mongoose';
import Young from '../models/Young';
import PasswordReset from '../models/PasswordReset';
import { emailService } from './emailService';
import {
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  hashCode,
  hashToken,
  RESET_ERROR,
  RESET_MAX_ATTEMPTS,
} from './passwordResetService';

const mockedYoung = Young as jest.Mocked<typeof Young>;
const mockedReset = PasswordReset as jest.Mocked<typeof PasswordReset>;
const mockedEmail = emailService as unknown as {
  isConfigured: jest.Mock;
  sendEmailOrThrow: jest.Mock;
  sendEmail: jest.Mock;
};

const youngId = new mongoose.Types.ObjectId();
const makeYoung = (over: Record<string, unknown> = {}) => ({
  _id: youngId,
  fullName: 'Valentina Pérez',
  email: 'valentina@test.com',
  placa: '@MODVALE014',
  password: 'hash-actual',
  comparePassword: jest.fn().mockResolvedValue(false),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);
const secondsAgo = (s: number) => new Date(Date.now() - s * 1000);

const errorCode = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error: any) {
    return error?.details?.code as string | undefined;
  }
  return undefined;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedEmail.isConfigured.mockReturnValue(true);
  mockedEmail.sendEmailOrThrow.mockResolvedValue(undefined);
  (mockedReset.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });
});

describe('requestPasswordReset', () => {
  it('si el correo no está configurado responde 503 y no toca la base', async () => {
    mockedEmail.isConfigured.mockReturnValue(false);
    await expect(requestPasswordReset('valentina@test.com')).rejects.toMatchObject(
      { statusCode: 503 }
    );
    expect(mockedYoung.findOne).not.toHaveBeenCalled();
  });

  it('cuenta inexistente, sin correo o sin contraseña: no crea nada ni envía', async () => {
    for (const found of [
      null,
      makeYoung({ email: '' }),
      makeYoung({ password: undefined }),
    ]) {
      mockedYoung.findOne.mockResolvedValueOnce(found as any);
      const result = await requestPasswordReset('alguien@test.com');
      expect(result.queued).toBe(false);
    }
    expect(mockedReset.create).not.toHaveBeenCalled();
    expect(mockedEmail.sendEmailOrThrow).not.toHaveBeenCalled();
  });

  it('busca solo cuentas activas (sin borrar, sin spam, sin fusionar)', async () => {
    mockedYoung.findOne.mockResolvedValueOnce(null as any);
    await requestPasswordReset('  Valentina@Test.com ');
    const filter = (mockedYoung.findOne as jest.Mock).mock.calls[0][0];
    expect(filter.$or).toEqual([
      { email: 'valentina@test.com' },
      { placa: 'VALENTINA@TEST.COM' },
    ]);
    expect(filter).toMatchObject({
      deletedAt: null,
      isSpam: { $ne: true },
      mergedInto: null,
    });
  });

  it('primera solicitud: guarda solo el HMAC y envía un código de 6 dígitos', async () => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
    mockedReset.findOne.mockResolvedValue(null as any);
    (mockedReset.create as jest.Mock).mockResolvedValue({});

    const result = await requestPasswordReset('valentina@test.com', '1.2.3.4');
    await result.delivery;

    expect(result.queued).toBe(true);
    const sent = mockedEmail.sendEmailOrThrow.mock.calls[0][0];
    expect(sent).toMatchObject({
      toEmail: 'valentina@test.com',
      type: 'password_reset',
      expiresInMinutes: 10,
    });
    expect(sent.resetCode).toMatch(/^\d{6}$/);

    const saved = (mockedReset.create as jest.Mock).mock.calls[0][0];
    expect(saved.codeHash).toBe(hashCode(String(youngId), sent.resetCode));
    expect(saved.codeHash).not.toContain(sent.resetCode);
    expect(saved.sentCount).toBe(1);
    expect(saved.attempts).toBe(0);
    expect(saved.codeExpiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
      10 * 60 * 1000
    );
    // el documento vive 1 hora para que el tope por hora siga contando
    expect(saved.expiresAt.getTime() - Date.now()).toBeGreaterThan(55 * 60 * 1000);
  });

  it('enfriamiento: no reenvía antes de 60 s', async () => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
    mockedReset.findOne.mockResolvedValue({
      _id: 'r1',
      lastSentAt: secondsAgo(20),
      windowStartedAt: minutesAgo(1),
      sentCount: 1,
    } as any);

    const result = await requestPasswordReset('valentina@test.com');
    expect(result.queued).toBe(false);
    expect(mockedEmail.sendEmailOrThrow).not.toHaveBeenCalled();
  });

  it('tope de 3 códigos por hora por cuenta', async () => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
    mockedReset.findOne.mockResolvedValue({
      _id: 'r1',
      lastSentAt: minutesAgo(5),
      windowStartedAt: minutesAgo(20),
      sentCount: 3,
    } as any);

    const result = await requestPasswordReset('valentina@test.com');
    expect(result.queued).toBe(false);
    expect(mockedReset.updateOne).not.toHaveBeenCalled();
  });

  it('pasada la hora la cuenta vuelve a contar desde 1', async () => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
    mockedReset.findOne.mockResolvedValue({
      _id: 'r1',
      lastSentAt: minutesAgo(90),
      windowStartedAt: minutesAgo(90),
      sentCount: 3,
    } as any);

    const result = await requestPasswordReset('valentina@test.com');
    expect(result.queued).toBe(true);
    const update = (mockedReset.updateOne as jest.Mock).mock.calls[0][1];
    expect(update.$set.sentCount).toBe(1);
    expect(update.$unset).toHaveProperty('resetTokenHash');
  });

  it('si Gmail falla invalida el código para no dejar uno que nadie recibió', async () => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
    mockedReset.findOne.mockResolvedValue(null as any);
    (mockedReset.create as jest.Mock).mockResolvedValue({});
    mockedEmail.sendEmailOrThrow.mockRejectedValue(new Error('SMTP caído'));

    const result = await requestPasswordReset('valentina@test.com');
    await result.delivery; // no lanza hacia afuera

    const [, update] = (mockedReset.updateOne as jest.Mock).mock.calls[0];
    expect(update.$set.codeExpiresAt.getTime()).toBe(0);
  });
});

describe('verifyResetCode', () => {
  const doc = (over: Record<string, unknown> = {}) => ({
    _id: 'r1',
    youngId,
    codeHash: hashCode(String(youngId), '123456'),
    attempts: 0,
    codeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    ...over,
  });

  beforeEach(() => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
  });

  it('rechaza un código que no tiene 6 dígitos', async () => {
    expect(await errorCode(verifyResetCode('valentina@test.com', '12ab56'))).toBe(
      RESET_ERROR.CODE_INVALID
    );
  });

  it('cuenta inexistente responde igual que un código inválido', async () => {
    mockedYoung.findOne.mockResolvedValue(null as any);
    expect(await errorCode(verifyResetCode('nadie@test.com', '123456'))).toBe(
      RESET_ERROR.CODE_INVALID
    );
  });

  it('código vencido', async () => {
    mockedReset.findOne.mockResolvedValue(
      doc({ codeExpiresAt: new Date(Date.now() - 1000) }) as any
    );
    expect(await errorCode(verifyResetCode('valentina@test.com', '123456'))).toBe(
      RESET_ERROR.CODE_EXPIRED
    );
  });

  it('código incorrecto cuenta el intento y dice cuántos quedan', async () => {
    mockedReset.findOne.mockResolvedValue(doc() as any);
    mockedReset.findOneAndUpdate.mockResolvedValue(
      doc({ attempts: 1 }) as any
    );
    try {
      await verifyResetCode('valentina@test.com', '000000');
      throw new Error('debió fallar');
    } catch (error: any) {
      expect(error.details).toMatchObject({
        code: RESET_ERROR.CODE_INVALID,
        attemptsLeft: RESET_MAX_ATTEMPTS - 1,
      });
    }
    // el intento se suma ANTES de comparar
    const [filter, update] = (mockedReset.findOneAndUpdate as jest.Mock).mock
      .calls[0];
    expect(filter.attempts).toEqual({ $lt: RESET_MAX_ATTEMPTS });
    expect(update).toEqual({ $inc: { attempts: 1 } });
  });

  it('el quinto intento fallido invalida el código', async () => {
    mockedReset.findOne.mockResolvedValue(doc({ attempts: 4 }) as any);
    mockedReset.findOneAndUpdate.mockResolvedValue(
      doc({ attempts: RESET_MAX_ATTEMPTS }) as any
    );
    expect(await errorCode(verifyResetCode('valentina@test.com', '000000'))).toBe(
      RESET_ERROR.TOO_MANY_ATTEMPTS
    );
    const [, update] = (mockedReset.updateOne as jest.Mock).mock.calls[0];
    expect(update.$set.codeExpiresAt.getTime()).toBe(0);
  });

  it('sin intentos disponibles (otra petición los agotó) no compara', async () => {
    mockedReset.findOne.mockResolvedValue(doc({ attempts: 4 }) as any);
    mockedReset.findOneAndUpdate.mockResolvedValue(null as any);
    expect(await errorCode(verifyResetCode('valentina@test.com', '123456'))).toBe(
      RESET_ERROR.TOO_MANY_ATTEMPTS
    );
  });

  it('código correcto: consume el código y entrega un token que se guarda hasheado', async () => {
    mockedReset.findOne.mockResolvedValue(doc() as any);
    mockedReset.findOneAndUpdate
      .mockResolvedValueOnce(doc({ attempts: 1 }) as any) // cuenta el intento
      .mockResolvedValueOnce(doc() as any); // reclama el token

    const { resetToken, expiresInSeconds } = await verifyResetCode(
      'valentina@test.com',
      '123456'
    );

    expect(resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(expiresInSeconds).toBe(600);
    const [, update] = (mockedReset.findOneAndUpdate as jest.Mock).mock.calls[1];
    expect(update.$set.resetTokenHash).toBe(hashToken(resetToken));
    expect(JSON.stringify(update)).not.toContain(resetToken);
    // el código viejo ya no sirve
    expect(update.$set.codeHash).not.toBe(hashCode(String(youngId), '123456'));
  });

  it('si otra petición reclamó el código primero, esta falla', async () => {
    mockedReset.findOne.mockResolvedValue(doc() as any);
    mockedReset.findOneAndUpdate
      .mockResolvedValueOnce(doc({ attempts: 1 }) as any)
      .mockResolvedValueOnce(null as any);
    expect(await errorCode(verifyResetCode('valentina@test.com', '123456'))).toBe(
      RESET_ERROR.CODE_INVALID
    );
  });
});

describe('resetPassword', () => {
  const token = 'a'.repeat(64);
  const goodPassword = 'Modelia2026';
  const resetDoc = { _id: 'r1', youngId, resetTokenHash: hashToken(token) };

  beforeEach(() => {
    mockedReset.findOne.mockResolvedValue(resetDoc as any);
    (mockedReset.findOneAndDelete as jest.Mock).mockResolvedValue(resetDoc);
  });

  it('token con formato inválido', async () => {
    expect(await errorCode(resetPassword('corto', goodPassword))).toBe(
      RESET_ERROR.TOKEN_INVALID
    );
  });

  it('contraseña débil: error y el token NO se consume (puede corregir)', async () => {
    await expect(resetPassword(token, 'debil')).rejects.toThrow(/8-50 caracteres/);
    expect(mockedReset.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('token vencido o inexistente', async () => {
    mockedReset.findOne.mockResolvedValue(null as any);
    expect(await errorCode(resetPassword(token, goodPassword))).toBe(
      RESET_ERROR.TOKEN_INVALID
    );
  });

  it('no permite dejar la misma contraseña', async () => {
    mockedYoung.findOne.mockResolvedValue(
      makeYoung({ comparePassword: jest.fn().mockResolvedValue(true) }) as any
    );
    expect(await errorCode(resetPassword(token, goodPassword))).toBe(
      RESET_ERROR.PASSWORD_SAME
    );
    expect(mockedReset.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('cuenta eliminada o spam entre el paso 2 y el 3: falla y borra la solicitud', async () => {
    mockedYoung.findOne.mockResolvedValue(null as any);
    expect(await errorCode(resetPassword(token, goodPassword))).toBe(
      RESET_ERROR.TOKEN_INVALID
    );
    expect(mockedReset.deleteOne).toHaveBeenCalledWith({ _id: 'r1' });
  });

  it('el token es de un solo uso: si otra petición lo consumió, falla', async () => {
    mockedYoung.findOne.mockResolvedValue(makeYoung() as any);
    (mockedReset.findOneAndDelete as jest.Mock).mockResolvedValue(null);
    expect(await errorCode(resetPassword(token, goodPassword))).toBe(
      RESET_ERROR.TOKEN_INVALID
    );
  });

  it('éxito: asigna la contraseña por save(), fija passwordChangedAt y avisa por correo', async () => {
    const young = makeYoung();
    mockedYoung.findOne.mockResolvedValue(young as any);

    await resetPassword(token, goodPassword);

    expect(young.password).toBe(goodPassword); // el hook pre('save') la hashea
    expect((young as any).first_login).toBe(false);
    expect((young as any).passwordChangedAt).toBeInstanceOf(Date);
    expect(young.save).toHaveBeenCalledWith({ validateModifiedOnly: true });
    expect(mockedReset.findOneAndDelete).toHaveBeenCalled();
    expect(mockedEmail.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'password_changed',
        toEmail: 'valentina@test.com',
        placa: '@MODVALE014',
      })
    );
  });
});
