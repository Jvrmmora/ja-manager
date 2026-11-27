import { Request, Response } from 'express';
import {
  formIdentifyLimiter,
  forgotPasswordLimiter,
  formSubmitLimiter,
  loginLimiter,
  placaCheckLimiter,
  resetPasswordLimiter,
  verifyResetCodeLimiter,
} from './rateLimiter';

type MockRes = Response & {
  statusCode?: number;
  body?: unknown;
};

const makeRes = (): MockRes => {
  const res = {} as MockRes;
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
};

const makeReq = (ip: string, username: string): Request =>
  ({
    headers: { 'x-forwarded-for': ip },
    body: { username },
    ip,
    socket: { remoteAddress: ip },
  }) as unknown as Request;

describe('loginLimiter', () => {
  it('permite los primeros intentos y bloquea al superar el límite por usuario', () => {
    const next = jest.fn();
    const ipBase = '10.0.0.1';

    // 5 permitidos por usuario
    for (let i = 0; i < 5; i++) {
      const res = makeRes();
      loginLimiter(makeReq(ipBase, 'victima@example.com'), res, next);
      expect(res.status).not.toHaveBeenCalledWith(429);
    }

    // el 6º se bloquea
    const blockedRes = makeRes();
    loginLimiter(makeReq(ipBase, 'victima@example.com'), blockedRes, next);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect((blockedRes.body as { success: boolean }).success).toBe(false);
  });

  it('bloquea por IP aunque cambien los nombres de usuario', () => {
    const next = jest.fn();
    const ip = '10.0.0.2';

    let blocked = false;
    for (let i = 0; i < 15; i++) {
      const res = makeRes();
      loginLimiter(makeReq(ip, `user${i}@example.com`), res, next);
      if ((res.status as jest.Mock).mock.calls.some(c => c[0] === 429)) {
        blocked = true;
      }
    }

    expect(blocked).toBe(true);
  });
});

describe('placaCheckLimiter', () => {
  it('permite 30 consultas por IP y bloquea la 31 (evita recorrer placas)', () => {
    const next = jest.fn();
    const ip = '10.0.0.9';

    for (let i = 0; i < 30; i++) {
      const res = makeRes();
      placaCheckLimiter(makeReq(ip, ''), res, next);
      expect(res.status).not.toHaveBeenCalled();
    }
    expect(next).toHaveBeenCalledTimes(30);

    const blockedRes = makeRes();
    placaCheckLimiter(makeReq(ip, ''), blockedRes, next);
    expect(blockedRes.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(30);

    // Otra IP no se ve afectada
    const otherRes = makeRes();
    placaCheckLimiter(makeReq('10.0.0.10', ''), otherRes, next);
    expect(otherRes.status).not.toHaveBeenCalled();
  });
});

describe('limitadores de formularios públicos', () => {
  it('formIdentifyLimiter bloquea la consulta 21 de una misma IP', () => {
    const next = jest.fn();
    for (let i = 0; i < 20; i++) {
      formIdentifyLimiter(makeReq('10.9.0.1', ''), makeRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(20);

    const res = makeRes();
    formIdentifyLimiter(makeReq('10.9.0.1', ''), res, next);
    expect(res.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(20);

    // Otra IP no se ve afectada
    formIdentifyLimiter(makeReq('10.9.0.2', ''), makeRes(), next);
    expect(next).toHaveBeenCalledTimes(21);
  });

  it('formSubmitLimiter usa su propio contador', () => {
    const next = jest.fn();
    for (let i = 0; i < 15; i++) {
      formSubmitLimiter(makeReq('10.9.1.1', ''), makeRes(), next);
    }
    const res = makeRes();
    formSubmitLimiter(makeReq('10.9.1.1', ''), res, next);
    expect(res.statusCode).toBe(429);
    expect((res.body as { message: string }).message).toMatch(/envíos/);
  });
});

describe('limiters de recuperación de contraseña', () => {
  const reqFor = (ip: string, identifier?: string): Request =>
    ({
      headers: { 'x-forwarded-for': ip },
      body: identifier === undefined ? {} : { identifier },
      ip,
      socket: { remoteAddress: ip },
    }) as unknown as Request;

  it('forgot-password: máximo 5 solicitudes por correo/placa (aunque cambie la IP)', () => {
    const next = jest.fn();
    for (let i = 0; i < 5; i++) {
      forgotPasswordLimiter(reqFor(`20.0.0.${i}`, 'Victima@Example.com'), makeRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(5);

    const blocked = makeRes();
    forgotPasswordLimiter(reqFor('20.0.0.99', ' victima@example.com '), blocked, next);
    expect(blocked.statusCode).toBe(429);
    expect(next).toHaveBeenCalledTimes(5);
  });

  it('forgot-password: máximo 10 por IP aunque cambie el identificador', () => {
    const next = jest.fn();
    for (let i = 0; i < 10; i++) {
      forgotPasswordLimiter(reqFor('21.0.0.1', `u${i}@example.com`), makeRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(10);

    const blocked = makeRes();
    forgotPasswordLimiter(reqFor('21.0.0.1', 'otro@example.com'), blocked, next);
    expect(blocked.statusCode).toBe(429);
  });

  it('verify-reset-code: 10 intentos por correo/placa y luego 429 con minutos de espera', () => {
    const next = jest.fn();
    for (let i = 0; i < 10; i++) {
      verifyResetCodeLimiter(reqFor(`22.0.0.${i}`, 'objetivo@example.com'), makeRes(), next);
    }
    const blocked = makeRes();
    verifyResetCodeLimiter(reqFor('22.0.0.200', 'objetivo@example.com'), blocked, next);
    expect(blocked.statusCode).toBe(429);
    expect((blocked.body as any).retryAfter).toBeGreaterThan(0);
  });

  it('reset-password: 20 por IP cada 15 minutos', () => {
    const next = jest.fn();
    for (let i = 0; i < 20; i++) {
      resetPasswordLimiter(reqFor('23.0.0.1'), makeRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(20);
    const blocked = makeRes();
    resetPasswordLimiter(reqFor('23.0.0.1'), blocked, next);
    expect(blocked.statusCode).toBe(429);
  });
});
