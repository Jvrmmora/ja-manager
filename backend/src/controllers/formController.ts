import { Request, Response } from 'express';
import Joi from 'joi';
import { IAuthUser } from '../types';
import { asyncHandler, ValidationError } from '../utils/errorHandler';
import {
  createFormSchema,
  formStatusSchema,
  responseListQuerySchema,
  updateFormSchema,
} from '../utils/formValidation';
import * as formService from '../services/forms/formService';
import * as sheetsSync from '../services/forms/sheets/sheetsSyncService';
import logger from '../utils/logger';

const validate = <T>(schema: Joi.Schema, data: unknown): T => {
  const { error, value } = schema.validate(data, { stripUnknown: true });
  if (error) throw new ValidationError(error.details[0].message);
  return value as T;
};

/**
 * Administración de formularios (scopes forms:read / forms:manage).
 */
export class FormController {
  static list = asyncHandler(async (_req: Request, res: Response) => {
    const data = await formService.listForms();
    res.json({ success: true, message: 'Formularios obtenidos', data });
  });

  static get = asyncHandler(async (req: Request, res: Response) => {
    const form = await formService.getFormOrFail(req.params.id);
    res.json({ success: true, message: 'Formulario obtenido', data: form.toJSON() });
  });

  static create = asyncHandler(async (req: Request, res: Response) => {
    const input = validate<{ title: string; template: 'blank' | 'event' }>(createFormSchema, req.body);
    const form = await formService.createForm(input, (req.user as IAuthUser).userId);
    res.status(201).json({ success: true, message: 'Formulario creado', data: form.toJSON() });
  });

  static update = asyncHandler(async (req: Request, res: Response) => {
    const input = validate<formService.FormUpdateInput>(updateFormSchema, req.body);
    const form = await formService.updateForm(req.params.id, input);
    res.json({ success: true, message: 'Formulario guardado', data: form.toJSON() });
  });

  static setStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status } = validate<{ status: 'DRAFT' | 'OPEN' | 'CLOSED' }>(formStatusSchema, req.body);
    const form = await formService.setFormStatus(req.params.id, status);
    const message = status === 'OPEN' ? 'Formulario publicado' : status === 'CLOSED' ? 'Formulario cerrado' : 'Formulario en borrador';
    res.json({ success: true, message, data: form.toJSON() });
  });

  static duplicate = asyncHandler(async (req: Request, res: Response) => {
    const form = await formService.duplicateForm(req.params.id, (req.user as IAuthUser).userId);
    res.status(201).json({ success: true, message: 'Formulario duplicado', data: form.toJSON() });
  });

  static remove = asyncHandler(async (req: Request, res: Response) => {
    await formService.deleteForm(req.params.id);
    res.json({ success: true, message: 'Formulario eliminado', data: null });
  });

  static uploadCover = asyncHandler(async (req: Request, res: Response) => {
    const url = await formService.uploadCoverImage(req.file);
    res.status(201).json({ success: true, message: 'Imagen subida', data: { url } });
  });

  static listResponses = asyncHandler(async (req: Request, res: Response) => {
    const query = validate<formService.ResponseListQuery>(responseListQuerySchema, req.query);
    const data = await formService.listResponses(req.params.id, query);
    res.json({ success: true, message: 'Respuestas obtenidas', data });
  });

  static stats = asyncHandler(async (req: Request, res: Response) => {
    const data = await formService.getFormStats(req.params.id);
    res.json({ success: true, message: 'Resumen obtenido', data });
  });

  static deleteResponse = asyncHandler(async (req: Request, res: Response) => {
    await formService.deleteResponse(req.params.id, req.params.responseId);
    res.json({ success: true, message: 'Respuesta eliminada', data: null });
    // La fila borrada también debe salir de la hoja (sin hacer esperar al admin)
    const form = await formService.getFormOrFail(req.params.id).catch(() => null);
    if (form?.sheets.enabled && sheetsSync.isSheetsConfigured()) {
      sheetsSync.fullResync(form).catch(error =>
        logger.warn('Resincronización tras borrar respuesta falló', { context: 'FormController', error: error?.message })
      );
    }
  });

  static sheetsConfig = asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Configuración de Google Sheets', data: sheetsSync.getSheetsConfig() });
  });

  static connectSheets = asyncHandler(async (req: Request, res: Response) => {
    const { spreadsheet } = validate<{ spreadsheet: string }>(
      Joi.object({ spreadsheet: Joi.string().trim().max(500).required() }),
      req.body
    );
    const data = await sheetsSync.connectSpreadsheet(req.params.id, spreadsheet);
    res.json({ success: true, message: `Conectado a «${data.title}»`, data });
  });

  static disconnectSheets = asyncHandler(async (req: Request, res: Response) => {
    const form = await sheetsSync.disconnectSpreadsheet(req.params.id);
    res.json({ success: true, message: 'Hoja desconectada', data: form.toJSON() });
  });

  static resyncSheets = asyncHandler(async (req: Request, res: Response) => {
    const data = await sheetsSync.resyncForm(req.params.id);
    res.json({ success: true, message: `Hoja actualizada (${data.rows} respuestas)`, data });
  });

  /** Disparado por cron (GitHub Actions) con x-cron-secret. */
  static retrySheets = asyncHandler(async (_req: Request, res: Response) => {
    const data = await sheetsSync.syncPending();
    res.json({ success: true, message: 'Reintento de sincronización completado', data });
  });

  static exportXlsx = asyncHandler(async (req: Request, res: Response) => {
    const { buffer, filename } = await formService.exportResponsesXlsx(req.params.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  });
}
