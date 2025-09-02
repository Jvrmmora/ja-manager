import { Request, Response } from 'express';
import Young from '../models/Young';
import Role from '../models/Role';
import { JWTService } from '../services/jwtService';
import { ILoginRequest, IAuthUser } from '../types';

export class AuthController {
  /**
   * Login de usuario
   */
  static async login(req: Request, res: Response) {
    try {
      const { username, password }: ILoginRequest = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos',
          message: 'Usuario y contraseña son requeridos'
        });
      }

      // Buscar usuario por email o placa
      const user = await Young.findOne({
        $or: [
          { email: username.toLowerCase() },
          { placa: username.toUpperCase() }
        ]
      }).populate('role_id');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
          message: 'Usuario o contraseña incorrectos'
        });
      }

      // Verificar que el usuario tiene contraseña (es un usuario de sistema)
      if (!user.password) {
        return res.status(401).json({
          success: false,
          error: 'Usuario sin acceso al sistema',
          message: 'Este usuario no tiene permisos de acceso al sistema'
        });
      }

      // Verificar contraseña
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
          message: 'Usuario o contraseña incorrectos'
        });
      }

      // Verificar que tiene rol asignado
      if (!user.role_id || !user.role_name) {
        return res.status(401).json({
          success: false,
          error: 'Usuario sin rol asignado',
          message: 'El usuario no tiene un rol válido asignado'
        });
      }

      // Crear payload del token
      const tokenPayload: IAuthUser = {
        username: user.placa || user.email,
        email: user.email,
        fullName: user.fullName,
        role_id: user.role_id.toString(),
        role_name: user.role_name
      };

      // Generar token
      const token = JWTService.generateToken(tokenPayload);

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          token,
          user: tokenPayload,
          expiresIn: JWTService.getExpirationTime()
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Error al procesar el inicio de sesión'
      });
    }
  }

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
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            placa: user.placa,
            role_name: user.role_name,
            role_id: user.role_id,
            profileImage: user.profileImage,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
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
   * Logout (invalidar token - implementación simple)
   */
  static async logout(req: Request, res: Response) {
    try {
      // En una implementación más robusta, aquí se agregaría el token a una blacklist
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Error al cerrar sesión'
      });
    }
  }
}
