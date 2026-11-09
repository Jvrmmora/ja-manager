import { Request, Response } from 'express';
import Joi from 'joi';
import { IAuthUser } from '../types';
import { asyncHandler, ValidationError } from '../utils/errorHandler';
import * as duplicates from '../services/youngDuplicates/youngDuplicateService';

const objectId = Joi.string().hex().length(24).required();
const mergeSchema = Joi.object({ sourceId: objectId, targetId: objectId });
const dismissSchema = Joi.object({ youngAId: objectId, youngBId: objectId });

const validate = <T>(schema: Joi.Schema, data: unknown): T => {
  const { error, value } = schema.validate(data, { stripUnknown: true });
  if (error) throw new ValidationError('Selecciona dos jóvenes válidos');
  return value as T;
};

/** Detección y fusión de jóvenes duplicados (scope young:merge). */
export class YoungDuplicateController {
  static list = asyncHandler(async (_req: Request, res: Response) => {
    const data = await duplicates.listDuplicatePairs();
    res.json({ success: true, message: 'Posibles duplicados', data });
  });

  static dismiss = asyncHandler(async (req: Request, res: Response) => {
    const { youngAId, youngBId } = validate<{ youngAId: string; youngBId: string }>(dismissSchema, req.body);
    await duplicates.dismissPair(youngAId, youngBId, (req.user as IAuthUser).userId);
    res.json({ success: true, message: 'Marcados como personas distintas', data: null });
  });

  static preview = asyncHandler(async (req: Request, res: Response) => {
    const { sourceId, targetId } = validate<{ sourceId: string; targetId: string }>(mergeSchema, req.query);
    const data = await duplicates.previewMerge(sourceId, targetId);
    res.json({ success: true, message: 'Vista previa de la fusión', data });
  });

  static merge = asyncHandler(async (req: Request, res: Response) => {
    const { sourceId, targetId } = validate<{ sourceId: string; targetId: string }>(mergeSchema, req.body);
    const data = await duplicates.mergeYoungs(sourceId, targetId, (req.user as IAuthUser).userId);
    res.json({ success: true, message: 'Jóvenes fusionados', data });
  });
}
