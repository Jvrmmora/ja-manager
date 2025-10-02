import { Request, Response } from 'express';
import Young from '../models/Young';
import Role from '../models/Role';
import { JWTService } from '../services/jwtService';
import { ILoginRequest, IAuthUser, IDecodedToken } from '../types';
import { authLogger } from '../utils/logger';
import { 
  asyncHandler, 
  ValidationError, 
  AuthenticationError, 
  NotFoundError 
} from '../utils/errorHandler';

export class AuthController {
  /**
   * Login de usuario
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password }: ILoginRequest = req.body;

    // Validar datos de entrada
    if (!username || !password) {
      authLogger.login(username || 'unknown', false, { reason: 'missing_credentials' });
      throw new ValidationError('Usuario y contraseña son requeridos');
    }

    authLogger.login(username, false, { step: 'attempting_login' });

    // Buscar usuario por email o placa
    const user = await Young.findOne({
      $or: [
        { email: username.toLowerCase() },
        { placa: username.toUpperCase() }
      ]
    });

    if (!user) {
      authLogger.login(username, false, { reason: 'user_not_found' });
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    // Verificar que el usuario tiene contraseña (es un usuario de sistema)
    if (!user.password) {
      authLogger.login(username, false, { reason: 'no_system_access', userId: user._id });
      throw new AuthenticationError('Este usuario no tiene permisos de acceso al sistema');
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      authLogger.login(username, false, { reason: 'invalid_password', userId: user._id });
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    // Verificar que tiene rol asignado
    if (!user.role_id || !user.role_name) {
      authLogger.login(username, false, { reason: 'no_role_assigned', userId: user._id });
      throw new AuthenticationError('El usuario no tiene un rol válido asignado');
    }

    // Crear payload del token - asegurar que role_id sea solo el ID
    let roleId: string;
    if (typeof user.role_id === 'object') {
      // Si role_id es un objeto (poblado), extraer el _id
      roleId = (user.role_id as any)._id.toString();
    } else {
      // Si role_id es un string/ObjectId, convertir a string
      roleId = user.role_id.toString();
    }

    const tokenPayload: IAuthUser = {
      username: user.placa || user.email,
      email: user.email,
      fullName: user.fullName,
      role_id: roleId, // Usar el ID extraído correctamente
      role_name: user.role_name
    };

    // Generar token
    const token = JWTService.generateToken(tokenPayload);

    authLogger.login(username, true, { 
      userId: user._id, 
      role: user.role_name,
      loginMethod: username.includes('@') ? 'email' : 'placa'
    });

    authLogger.token('generated', username, { expiresIn: JWTService.getExpirationTime() });

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        expiresIn: JWTService.getExpirationTime(),
        first_login: user.first_login || false
      }
    });
  });

  /**
   * Obtener información del usuario autenticado
   */
  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado',
          message: 'Usuario no autenticado'
        });
      }

      // Buscar información completa del usuario
      const user = await Young.findOne({
        $or: [
          { email: req.user.email },
          { placa: req.user.username }
        ]
      }).populate('role_id').select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
          message: 'No se encontró información del usuario'
        });
      }

      res.json({
        success: true,
        message: 'Perfil obtenido exitosamente',
        data: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          birthday: user.birthday,
          ageRange: user.ageRange,
          gender: user.gender,
          placa: user.placa,
          role: user.role,
          role_name: user.role_name,
          role_id: user.role_id,
          group: user.group,
          skills: user.skills,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Error al obtener información del perfil'
      });
    }
  }

  /**
   * Logout de usuario
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      try {
        // Extraer información del token para el log
        const decoded = JWTService.verifyToken(token) as IDecodedToken;
        if (decoded) {
          authLogger.logout(decoded.username, true);
          authLogger.token('invalidated', decoded.username);
        }
      } catch (error) {
        // Token inválido o expirado - igual registramos el intento de logout
        authLogger.logout('unknown', false, { reason: 'invalid_token' });
      }
    } else {
      authLogger.logout('unknown', false, { reason: 'no_token' });
    }

    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  });

  /**
   * Verificar token de usuario
   */
  static verify = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      authLogger.token('verification_failed', 'unknown', { reason: 'no_token' });
      throw new AuthenticationError('Token de acceso requerido');
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = JWTService.verifyToken(token) as IDecodedToken;
      if (decoded) {
        authLogger.token('verified', decoded.username);
        
        res.json({
          success: true,
          message: 'Token válido',
          data: {
            user: decoded,
            expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null
          }
        });
      } else {
        throw new AuthenticationError('Token inválido');
      }
    } catch (error) {
      authLogger.token('verification_failed', 'unknown', { 
        reason: 'invalid_token',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AuthenticationError('Token inválido o expirado');
    }
  });

  /**
   * Obtener el perfil del usuario autenticado
   */
  static profile = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user as IAuthUser;
    
    if (!user) {
      authLogger.profile('unknown', false, { reason: 'no_user_in_request' });
      throw new AuthenticationError('Usuario no autenticado');
    }

    // Buscar información completa del usuario
    const fullUser = await Young.findOne({
      $or: [
        { email: user.email },
        { placa: user.username }
      ]
    }).select('-password');

    if (!fullUser) {
      authLogger.profile(user.username, false, { reason: 'user_not_found' });
      throw new NotFoundError('Usuario no encontrado');
    }

    authLogger.profile(user.username, true);

    res.json({
      success: true,
      message: 'Perfil obtenido exitosamente',
      data: {
        user: {
          id: fullUser._id,
          fullName: fullUser.fullName,
          email: fullUser.email,
          placa: fullUser.placa,
          ageRange: fullUser.ageRange,
          phone: fullUser.phone,
          birthday: fullUser.birthday,
          profileImage: fullUser.profileImage,
          role_name: fullUser.role_name,
          groups: fullUser.group,
          createdAt: fullUser.createdAt,
          updatedAt: fullUser.updatedAt
        }
      }
    });
  });
}
