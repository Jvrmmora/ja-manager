import jwt from 'jsonwebtoken';
import { IAuthUser } from '../types';

export class JWTService {
  private static readonly secretKey =
    process.env.JWT_SECRET || 'your-super-secret-key';

  /**
   * Convierte una cadena de duración (ej: "10d", "24h") a milisegundos
   */
  private static parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 10 * 24 * 60 * 60 * 1000; // Default 10 días

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 10 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Genera un token JWT con expiración incluida en el payload
   */
  static generateToken(payload: IAuthUser, expiresIn?: string): string {
    const exp = expiresIn || this.getExpirationTime();
    const expirationMs = this.parseDuration(exp);
    const expirationTime =
      Math.floor(Date.now() / 1000) + Math.floor(expirationMs / 1000);

    // Crear el payload con la expiración
    const tokenPayload = {
      ...payload,
      exp: expirationTime, // Timestamp Unix de expiración (estándar JWT)
      expiresAt: new Date(expirationTime * 1000).toISOString(), // ISO string legible
    };

    return jwt.sign(tokenPayload, this.secretKey);
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
    return process.env.TOKEN_EXP || '90d';
  }

  /**
   * Genera un token JWT especial para redención de puntos de cumpleaños
   */
  static generateBirthdayToken(
    youngId: string,
    youngEmail: string,
    expiresIn: string = '30d'
  ): string {
    const payload = {
      youngId,
      type: 'birthday',
      email: youngEmail,
    };

    return jwt.sign(payload, this.secretKey, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Verifica y decodifica un token de cumpleaños
   */
  static verifyBirthdayToken(
    token: string
  ): { youngId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.secretKey) as any;

      // Validar que sea un token de cumpleaños
      if (decoded.type !== 'birthday') {
        return null;
      }

      return {
        youngId: decoded.youngId,
        email: decoded.email,
      };
    } catch (error) {
      // Token expirado o inválido
      return null;
    }
  }
}
