jest.mock('../models/Role');
jest.mock('../services/jwtService', () => ({
  JWTService: { verifyToken: jest.fn() },
}));

import { Request, Response } from 'express';
import Role from '../models/Role';
import { JWTService } from '../services/jwtService';
import { optionalAuth } from './auth';

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
