import { Request, Response } from 'express';
import { loginLimiter } from './rateLimiter';

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
