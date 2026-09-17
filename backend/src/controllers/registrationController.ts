import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as registrationService from '../services/registrationService';
import {
  partialRegistrationSchema,
  reviewRequestSchema,
  querySchema,
} from '../utils/validation';
import { asyncHandler, ValidationError } from '../utils/errorHandler';
import { ApiResponse, PaginatedResponse } from '../types';

export class RegistrationController {
  /**
   * Validar si un email es único (no existe en Young ni en RegistrationRequest pendiente)
   */
  static checkEmailUnique = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        res.status(400).json({
          success: false,
          exists: false,
          message: 'Email requerido',
        });
        return;
      }

      const result = await registrationService.checkEmailUnique(
        email.trim().toLowerCase()
      );

      res.status(200).json({ success: true, ...result });
    }
  );

  /**
   * Validar si una placa de referido existe en Young
   */
  static checkPlacaExists = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { placa } = req.query;

      if (!placa || typeof placa !== 'string') {
        res.status(400).json({
          success: false,
          exists: false,
          message: 'Placa requerida',
        });
        return;
      }

      const normalizedPlaca = placa.trim().toUpperCase();
      const placaRegex = /^@MOD[A-Z]{2,4}\d{3}$/;
      if (!placaRegex.test(normalizedPlaca)) {
        res.status(400).json({
          success: false,
          exists: false,
          message: 'Formato de placa inválido',
        });
        return;
      }

      const result = await registrationService.checkPlacaExists(normalizedPlaca);

      res.status(200).json({ success: true, ...result });
    }
  );

  /**
   * Crear solicitud de registro parcial
   * Crea usuario Young directamente con acceso inmediato
   */
  static createRegistrationRequest = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { error, value } = partialRegistrationSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const { placa, savedYoung } =
        await registrationService.createRegistrationRequest(
          value,
          req.file,
          req
        );

      res.status(201).json({
        success: true,
        message:
          '¡Cuenta creada exitosamente! Ya puedes iniciar sesión. Tu placa asignada es: ' +
          placa,
        data: {
          id: (savedYoung._id as mongoose.Types.ObjectId).toString(),
          placa: savedYoung.placa,
          fullName: savedYoung.fullName,
          email: savedYoung.email,
          ageRange: savedYoung.ageRange,
          role: savedYoung.role,
        },
      } as ApiResponse);
    }
  );

  /**
   * Obtener todas las solicitudes de registro (solo Super Admin)
   */
  static getAllRegistrationRequests = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;

      const { error, value } = querySchema.validate(req.query);
      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const result = await registrationService.getAllRegistrationRequests(
        authUser,
        value
      );

      res.status(200).json({
        success: true,
        message: 'Solicitudes obtenidas exitosamente',
        data: result,
      } as ApiResponse<PaginatedResponse<any>>);
    }
  );

  /**
   * Obtener una solicitud por ID (solo Super Admin)
   */
  static getRegistrationRequestById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;
      const { id } = req.params;

      const data = await registrationService.getRegistrationRequestById(
        id,
        authUser
      );

      res.status(200).json({
        success: true,
        message: 'Solicitud obtenida exitosamente',
        data,
      } as ApiResponse);
    }
  );

  /**
   * Aprobar o rechazar una solicitud (solo Super Admin)
   */
  static reviewRegistrationRequest = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const authUser = (req as any).user;
      const { id } = req.params;
      const { error, value } = reviewRequestSchema.validate(req.body);

      if (error) {
        throw new ValidationError(error.details[0].message);
      }

      const result = await registrationService.reviewRegistrationRequest(
        id,
        value,
        authUser
      );

      if (result.approved) {
        res.status(200).json({
          success: true,
          message: 'Solicitud aprobada y joven creado exitosamente',
          data: { request: result.request, young: result.young },
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Solicitud rechazada exitosamente',
        data: result.request,
      } as ApiResponse);
    }
  );
}
