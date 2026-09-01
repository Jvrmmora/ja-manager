import jwt from 'jsonwebtoken';
import { JWTService } from './jwtService';
import { IAuthUser } from '../types';

const user: IAuthUser = {
  userId: '507f1f77bcf86cd799439011',
  username: '@MODTEST001',
  email: 'test@example.com',
  fullName: 'Test User',
  role_id: '507f1f77bcf86cd799439012',
  role_name: 'Super Admin',
};

describe('JWTService', () => {
  it('genera y verifica un token válido', () => {
    const token = JWTService.generateToken(user);
    const decoded = JWTService.verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(user.userId);
    expect(decoded?.role_name).toBe('Super Admin');
  });

  it('rechaza un token manipulado', () => {
    const token = JWTService.generateToken(user);
    const tampered = token.slice(0, -3) + 'abc';

    expect(JWTService.verifyToken(tampered)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', () => {
    const foreign = jwt.sign({ ...user }, 'otro-secreto-cualquiera', {
      algorithm: 'HS256',
    });

    expect(JWTService.verifyToken(foreign)).toBeNull();
  });

  it('rechaza un token con algoritmo "none"', () => {
    const noneToken = jwt.sign({ ...user }, '', { algorithm: 'none' });

    expect(JWTService.verifyToken(noneToken)).toBeNull();
  });

  it('rechaza un token expirado', () => {
    const expired = JWTService.generateToken(user, '1s');
    // exp se calcula hacia adelante; forzamos expiración simulando el reloj
    const decodedRaw = jwt.decode(expired) as { exp: number };
    const past = decodedRaw.exp + 10;
    jest.spyOn(Date, 'now').mockReturnValue(past * 1000);

    expect(JWTService.verifyToken(expired)).toBeNull();

    (Date.now as jest.Mock).mockRestore();
  });

  it('el token de cumpleaños solo valida con type=birthday', () => {
    const bday = JWTService.generateBirthdayToken('id-123', 'a@b.com');
    const ok = JWTService.verifyBirthdayToken(bday);
    expect(ok?.youngId).toBe('id-123');

    const normal = JWTService.generateToken(user);
    expect(JWTService.verifyBirthdayToken(normal)).toBeNull();
  });
});
