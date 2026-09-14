import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as youngService from '../services/youngService';
import {
  createYoungSchema,
  updateYoungSchema,
  querySchema,
  resetPasswordSchema,
} from '../utils/validation';
import { ApiResponse, PaginatedResponse, IYoung } from '../types';
import { asyncHandler, ValidationError } from '../utils/errorHandler';
import logger from '../utils/logger';

export class YoungController {
  // Obtener todos los jóvenes con paginación y filtros
  static async getAllYoung(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = querySchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Parámetros de consulta inválidos',
          error: error.details[0].message,
        } as ApiResponse);
        return;
      }

      const result = await youngService.listYoung(value);

      const response: ApiResponse<PaginatedResponse<IYoung>> = {
        success: true,
        message: 'Jóvenes obtenidos exitosamente',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error obteniendo jóvenes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudieron obtener los jóvenes',
      } as ApiResponse);
    }
  }

  // Obtener un joven por ID
  static getYoungById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const authUser = (req as any).user;

      logger.info('Obteniendo joven por ID', {
        context: 'YoungController',
        method: 'getYoungById',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
      });

      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Formato de ID no válido');
      }

      const young = await youngService.getYoungById(id, authUser);

      logger.info('Joven obtenido exitosamente', {
        context: 'YoungController',
        method: 'getYoungById',
        youngId: id,
        youngName: young.fullName,
      });

      res.status(200).json({
        success: true,
        message: 'Joven obtenido exitosamente',
        data: young,
      } as ApiResponse<IYoung>);
    }
  );

  // Crear un nuevo joven
  static createYoung = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = createYoungSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const savedYoung = await youngService.createYoung(value, req.file);

      res.status(201).json({
        success: true,
        message: 'Joven creado exitosamente',
        data: savedYoung,
      } as ApiResponse<IYoung>);
    }
  );

  // Actualizar un joven
  static updateYoung = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const authUser = (req as any).user;
      const { error, value } = updateYoungSchema.validate(req.body);

      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      logger.info('Actualizando joven', {
        context: 'YoungController',
        method: 'updateYoung',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
        fieldsToUpdate: Object.keys(value),
      });

      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Formato de ID no válido');
      }

      const updatedYoung = await youngService.updateYoung(
        id,
        value,
        authUser,
        req.file
      );

      logger.info('Joven actualizado exitosamente', {
        context: 'YoungController',
        method: 'updateYoung',
        youngId: id,
        youngName: updatedYoung?.fullName,
      });

      res.status(200).json({
        success: true,
        message: 'Joven actualizado exitosamente',
        data: updatedYoung,
      } as ApiResponse<IYoung>);
    }
  );

  // Eliminar un joven
  static async deleteYoung(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const young = await youngService.deleteYoung(id);

      if (!young) {
        res.status(404).json({
          success: false,
          message: 'Joven no encontrado',
        } as ApiResponse);
        return;
      }

      logger.info('Joven marcado como eliminado (soft delete)', {
        context: 'YoungController',
        method: 'deleteYoung',
        youngId: id,
        youngName: young.fullName,
      });

      res.status(200).json({
        success: true,
        message: 'Joven eliminado exitosamente',
      } as ApiResponse);
    } catch (error) {
      console.error('Error eliminando joven:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudo eliminar el joven',
      } as ApiResponse);
    }
  }

  // Obtener estadísticas
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await youngService.getStats();

      res.status(200).json({
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
      } as ApiResponse);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'No se pudieron obtener las estadísticas',
      } as ApiResponse);
    }
  }

  // Generar placa para un joven
  static generatePlaca = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }

      const data = await youngService.generatePlaca(id);

      logger.info('Placa y contraseña generadas exitosamente', {
        context: 'YoungController',
        method: 'generatePlaca',
        youngId: id,
        placa: data.placa,
      });

      res.json({
        success: true,
        message: 'Placa y contraseña generadas exitosamente',
        data,
      });
    }
  );

  // Resetear contraseña de un joven
  static resetPassword = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const authUser = (req as any).user;

      const { error, value } = resetPasswordSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      logger.info('Iniciando reseteo de contraseña', {
        context: 'YoungController',
        method: 'resetPassword',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
      });

      if (!id) {
        throw new ValidationError('ID del joven es requerido');
      }
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Formato de ID no válido');
      }
      if (!value.new_password) {
        throw new ValidationError('Nueva contraseña es requerida');
      }
      if (authUser.role_name === 'Young role' && !value.current_password) {
        throw new ValidationError('Contraseña actual es requerida para jóvenes');
      }

      const data = await youngService.resetPassword(id, value, authUser);

      logger.info('Contraseña reseteada exitosamente', {
        context: 'YoungController',
        method: 'resetPassword',
        youngId: id,
        requestedBy: authUser.username,
        role: authUser.role_name,
      });

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
        data,
      });
    }
  );

  /**
   * Obtener usuarios Young registrados recientemente (últimos 30 días)
   * Solo accesible para Super Admin y Admin
   */
  static getRecentYoungUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;
      const {
        page = 1,
        limit = 10,
        search = '',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        days = 30,
      } = req.query;

      const result = await youngService.getRecentYoungUsers(authUser, {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
        days: parseInt(days as string, 10),
      });

      logger.info('Registros recientes obtenidos', {
        context: 'YoungController',
        method: 'getRecentYoungUsers',
        totalItems: result.pagination.totalItems,
        requestedBy: authUser.username,
      });

      res.json({
        success: true,
        message: 'Registros recientes obtenidos exitosamente',
        data: result,
      } as ApiResponse);
    }
  );

  /**
   * Marcar usuario como spam
   * Solo accesible para Super Admin y Admin
   */
  static markUserAsSpam = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;
      const { id } = req.params;
      const { isSpam = true } = req.body;

      const data = await youngService.markUserAsSpam(id, isSpam, authUser);

      logger.info('Usuario marcado como spam', {
        context: 'YoungController',
        method: 'markUserAsSpam',
        youngId: id,
        isSpam,
        requestedBy: authUser.username,
      });

      res.json({
        success: true,
        message: isSpam
          ? 'Usuario marcado como spam exitosamente'
          : 'Usuario desmarcado como spam exitosamente',
        data,
      } as ApiResponse);
    }
  );

  /**
   * Obtener conteo de usuarios registrados recientemente (últimas 48 horas)
   * Para mostrar badge en UI del admin
   * Solo accesible para Super Admin y Admin
   */
  static getRecentUsersCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;
      const { hours = 48 } = req.query;

      const data = await youngService.getRecentUsersCount(
        authUser,
        parseInt(hours as string, 10)
      );

      logger.info('Contador de registros recientes', {
        context: 'YoungController',
        method: 'getRecentUsersCount',
        count: data.count,
        requestedBy: authUser.username,
      });

      res.json({
        success: true,
        data,
      } as ApiResponse);
    }
  );
}
