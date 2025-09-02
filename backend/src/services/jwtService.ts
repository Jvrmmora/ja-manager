import jwt from 'jsonwebtoken';
import { IAuthUser } from '../types';

export class JWTService {
  private static readonly secretKey = process.env.JWT_SECRET || 'your-super-secret-key';

  /**
   * Genera un token JWT
   */
  static generateToken(payload: IAuthUser): string {
    return jwt.sign(
      payload, 
      this.secretKey
    );
  }

  /**
   * Verifica y decodifica un token JWT
   */
  static verifyToken(token: string): IAuthUser | null {
    try {
      const decoded = jwt.verify(token, this.secretKey) as IAuthUser;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Decodifica un token sin verificar (para debug)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Obtiene el tiempo de expiración configurado
   */
  static getExpirationTime(): string {
    return process.env.JWT_EXPIRES_IN || '10d';
  }
}
