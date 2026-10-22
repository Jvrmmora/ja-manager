import { Request, Response } from 'express';
import { asyncHandler, ValidationError } from '../utils/errorHandler';
import { placaIdentifySchema, submitResponseSchema } from '../utils/formValidation';
import { getClientIp } from '../middleware/rateLimiter';
import {
  getPublicForm,
  identifyByPlaca,
  Requester,
  submitResponse,
  SubmitPayload,
} from '../services/forms/formResponseService';

/** Usuario de optionalAuth → quien responde (o undefined si es anónimo). */
const requesterFrom = (req: Request): Requester | undefined =>
  req.user ? { userId: req.user.userId, scopes: req.userRole?.scopes || [] } : undefined;

/**
 * Endpoints públicos del formulario (/f/:slug). La sesión es opcional.
 */
export class PublicFormController {
  static get = asyncHandler(async (req: Request, res: Response) => {
    const data = await getPublicForm(req.params.slug, requesterFrom(req));
    res.json({ success: true, message: 'Formulario obtenido', data });
  });

  static identify = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = placaIdentifySchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);
    const data = await identifyByPlaca(req.params.slug, value.placa);
    res.json({ success: true, message: 'Placa encontrada', data });
  });

  static submit = asyncHandler(async (req: Request, res: Response) => {
    const { error, value } = submitResponseSchema.validate(req.body, { stripUnknown: true });
    if (error) throw new ValidationError(error.details[0].message);
    const data = await submitResponse(
      req.params.slug,
      value as SubmitPayload,
      requesterFrom(req),
      { ip: getClientIp(req) }
    );
    res.status(data.updated ? 200 : 201).json({
      success: true,
      message: data.updated ? 'Actualizamos tu respuesta' : '¡Respuesta enviada!',
      data,
    });
  });
}
