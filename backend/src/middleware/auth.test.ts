jest.mock('../models/Role');
jest.mock('../services/jwtService', () => ({
  JWTService: { verifyToken: jest.fn() },
}));

import { Request, Response } from 'express';
import Role from '../models/Role';
import { JWTService } from '../services/jwtService';
import mongoose from 'mongoose';
import { authenticateToken, optionalAuth, requireScope } from './auth';

const mockedRole = Role as jest.Mocked<typeof Role>;
const mockedVerify = JWTService.verifyToken as jest.Mock;

const makeReq = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as unknown as Request;

describe('optionalAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sin token sigue como anónimo', async () => {
    const req = makeReq();
    const next = jest.fn();
    await optionalAuth(req, {} as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('token inválido o expirado NO bloquea: sigue como anónimo', async () => {
    mockedVerify.mockReturnValue(null);
    const req = makeReq('Bearer viejo');
    const next = jest.fn();
    await optionalAuth(req, {} as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('token válido adjunta usuario y rol', async () => {
    const user = { userId: 'y1', role_id: 'r1' };
    mockedVerify.mockReturnValue(user);
    mockedRole.findById.mockResolvedValue({ name: 'Young role', scopes: ['young:read'] } as any);
    const req = makeReq('Bearer bueno');
    const next = jest.fn();
    await optionalAuth(req, {} as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBe(user);
    expect(req.userRole.scopes).toEqual(['young:read']);
  });

  it('si falla la base sigue como anónimo en vez de responder 500', async () => {
    mockedVerify.mockReturnValue({ userId: 'y1', role_id: 'r1' });
    mockedRole.findById.mockRejectedValue(new Error('db caída'));
    const req = makeReq('Bearer bueno');
    const next = jest.fn();
    await optionalAuth(req, {} as Response, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });
});

describe('authenticateToken: 401 sesión muerta, 403 solo sin permisos', () => {
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response & { status: jest.Mock; json: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mongoose.connection as any).readyState = 1;
  });

  it('token inválido o vencido responde 401', async () => {
    mockedVerify.mockReturnValue(null);
    const res = makeRes();
    const next = jest.fn();
    await authenticateToken(makeReq('Bearer viejo'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rol inexistente responde 401', async () => {
    mockedVerify.mockReturnValue({ userId: 'y1', role_id: 'r1' });
    mockedRole.findById.mockResolvedValue(null as any);
    const res = makeRes();
    await authenticateToken(makeReq('Bearer bueno'), res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('sesión válida pero sin scope responde 403 (no cierra sesión)', () => {
    const req = {
      user: { userId: 'y1' },
      userRole: { scopes: ['young:read'] },
    } as unknown as Request;
    const res = makeRes();
    const next = jest.fn();
    requireScope('young:update')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
