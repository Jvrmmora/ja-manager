import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { JWTService } from '../services/jwtService';
import Role from '../models/Role';
import { IAuthUser } from '../types';

// Extender el Request para incluir información del usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
      userRole?: any;
    }
  }
}

// Scopes definidos para cada endpoint
export const SCOPES = {
  // Young endpoints
  'young:read': 'Leer información de jóvenes',
  'young:create': 'Crear jóvenes',
  'young:update': 'Actualizar jóvenes',
  'young:delete': 'Eliminar jóvenes',
  'young:stats': 'Ver estadísticas de jóvenes',
  
  // Placa management
  'placa:generate': 'Generar placa para jóvenes',
  
  // Password management
  'password:reset': 'Resetear contraseñas',
  
  // Import/Export endpoints
  'import:read': 'Descargar plantillas y exportar datos',
  'import:create': 'Importar datos desde Excel',
  
  // System endpoints
  'system:health': 'Verificar estado del sistema',
  
  // Auth endpoints
  'auth:login': 'Iniciar sesión',
  
  // Registration endpoints
  'registration:create': 'Crear solicitud de registro',
  'registration:read': 'Ver solicitudes de registro',
  'registration:review': 'Revisar solicitudes de registro',
} as const;

/**
 * Middleware para verificar el token JWT
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar que la conexión a MongoDB esté activa
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Servicio no disponible',
        message: 'La base de datos no está disponible en este momento'
      });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de acceso requerido',
        message: 'No se proporcionó un token de autenticación'
      });
    }

    const decoded = JWTService.verifyToken(token);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        error: 'Token inválido',
        message: 'El token proporcionado no es válido o ha expirado'
      });
    }

    // Obtener el rol del usuario
    const role = await Role.findById(decoded.role_id);
    if (!role) {
      return res.status(403).json({
        success: false,
        error: 'Rol no encontrado',
        message: 'El rol del usuario no existe en el sistema'
      });
    }

    req.user = decoded;
    req.userRole = role;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'Error al procesar la autenticación'
    });
  }
};

/**
 * Middleware para verificar si el usuario tiene los scopes necesarios
 */
export const requireScope = (requiredScope: keyof typeof SCOPES) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.userRole) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
          message: 'Debe estar autenticado para acceder a este recurso'
        });
      }

      const userScopes = req.userRole.scopes || [];
      
      if (!userScopes.includes(requiredScope)) {
        return res.status(403).json({
          success: false,
          error: 'Permisos insuficientes',
          message: `No tiene permisos para: ${SCOPES[requiredScope]}`
        });
      }

      next();
    } catch (error) {
      console.error('Error verificando scopes:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Error al verificar permisos'
      });
    }
  };
};

/**
 * Middleware combinado: autenticar + verificar scope
 */
export const authenticateAndAuthorize = (requiredScope: keyof typeof SCOPES) => {
  return [authenticateToken, requireScope(requiredScope)];
};
