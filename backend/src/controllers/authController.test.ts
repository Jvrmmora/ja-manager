jest.mock('../models/Young');
jest.mock('../models/Role');
jest.mock('../services/emailService', () => ({
  emailService: { isConfigured: jest.fn().mockReturnValue(true) },
}));
jest.mock('../services/passwordResetService', () => ({
  RESET_CODE_TTL_MS: 600000,
  RESET_COOLDOWN_MS: 60000,
  requestPasswordReset: jest.fn().mockResolvedValue({ queued: false }),
  verifyResetCode: jest.fn(),
  resetPassword: jest.fn().mockResolvedValue(undefined),
}));

import { Request, Response } from 'express';
import Young from '../models/Young';
import { AuthController } from './authController';
import {
  requestPasswordReset,
  resetPassword,
} from '../services/passwordResetService';

const mockedYoung = Young as jest.Mocked<typeof Young>;

// asyncHandler no devuelve la promesa: se espera un ciclo del event loop.
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & { json: jest.Mock };
};
const makeReq = (body: Record<string, unknown>) =>
  ({ body, headers: {}, ip: '1.1.1.1', socket: {} }) as unknown as Request;

describe('AuthController.login: cuentas eliminadas o spam', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['eliminada', { deletedAt: new Date() }],
    ['marcada como spam', { isSpam: true }],
  ])('cuenta %s no puede iniciar sesión y recibe el mismo mensaje genérico', async (_l, flags) => {
    const comparePassword = jest.fn().mockResolvedValue(true);
    mockedYoung.findOne.mockResolvedValue({
      _id: 'y1',
      password: 'hash',
      comparePassword,
      role_id: 'r1',
      role_name: 'Young role',
      ...flags,
    } as any);

    const next = jest.fn();
    await AuthController.login(
      makeReq({ username: 'ana@test.com', password: 'Correcta123' }),
      makeRes(),
      next
    );
    await flush();

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Usuario o contraseña incorrectos',
      })
    );
    // ni siquiera llega a comparar la contraseña
    expect(comparePassword).not.toHaveBeenCalled();
  });
});

describe('AuthController: recuperación de contraseña', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forgot-password responde siempre lo mismo y no revela si la cuenta existe', async () => {
    const res = makeRes();
    await AuthController.forgotPassword(
      makeReq({ identifier: 'nadie@test.com' }),
      res,
      jest.fn()
    );
    await flush();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.message).toMatch(/Si existe una cuenta/);
    expect(payload.data).toEqual({
      codeLength: 6,
      expiresInMinutes: 10,
      resendAfterSeconds: 60,
    });
    expect(requestPasswordReset).toHaveBeenCalledWith('nadie@test.com', '1.1.1.1');
  });

  it('forgot-password sin identificador es un error de validación', async () => {
    const next = jest.fn();
    await AuthController.forgotPassword(makeReq({}), makeRes(), next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('reset-password rechaza contraseñas que no coinciden antes de tocar el servicio', async () => {
    const next = jest.fn();
    await AuthController.resetPassword(
      makeReq({
        resetToken: 'a'.repeat(64),
        newPassword: 'Modelia2026',
        confirmPassword: 'Otra12345',
      }),
      makeRes(),
      next
    );
    await flush();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('reset-password con datos válidos responde éxito', async () => {
    const res = makeRes();
    await AuthController.resetPassword(
      makeReq({
        resetToken: 'a'.repeat(64),
        newPassword: 'Modelia2026',
        confirmPassword: 'Modelia2026',
      }),
      res,
      jest.fn()
    );
    await flush();
    expect(resetPassword).toHaveBeenCalledWith('a'.repeat(64), 'Modelia2026');
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });
});
