import { Request, Response } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import { IAuthUser } from '../types';
import BirthdayGuest from '../models/BirthdayGuest';
import { asyncHandler, NotFoundError, ValidationError } from '../utils/errorHandler';
import {
  currentSemester,
  generateBirthdayReport,
  reportToCsv,
  Semester,
} from '../services/birthdayReportService';

const reportQuerySchema = Joi.object({
  semester: Joi.number().valid(1, 2),
  formId: Joi.string().hex().length(24).allow('', null),
});

const guestSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  day: Joi.number().integer().min(1).max(31).required(),
  formId: Joi.string().hex().length(24).allow('', null),
});

const validate = <T>(schema: Joi.Schema, data: unknown): T => {
  const { error, value } = schema.validate(data, { stripUnknown: true });
  if (error) throw new ValidationError(error.details[0].message);
  return value as T;
};

const parseReportQuery = (query: unknown) => {
  const { semester, formId } = validate<{ semester?: number; formId?: string | null }>(
    reportQuerySchema,
    query
  );
  return {
    semester: (semester ?? currentSemester()) as Semester,
    formId: formId || null,
  };
};

/**
 * Reporte de cumpleaños por semestre (scopes forms:read / forms:manage).
 */
export class BirthdayReportController {
  static get = asyncHandler(async (req: Request, res: Response) => {
    const { semester, formId } = parseReportQuery(req.query);
    const data = await generateBirthdayReport(semester, formId);
    res.json({ success: true, message: 'Reporte generado', data });
  });

  static csv = asyncHandler(async (req: Request, res: Response) => {
    const { semester, formId } = parseReportQuery(req.query);
    const report = await generateBirthdayReport(semester, formId);
    const year = new Date().getFullYear();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cumpleanos-semestre-${semester}-${year}.csv"`
    );
    res.send(reportToCsv(report));
  });

  static listGuests = asyncHandler(async (req: Request, res: Response) => {
    const formId = typeof req.query.formId === 'string' ? req.query.formId : '';
    const filter =
      formId && mongoose.Types.ObjectId.isValid(formId)
        ? { $or: [{ formId: null }, { formId }] }
        : {};
    const guests = await BirthdayGuest.find(filter).sort({ fullName: 1 });
    res.json({ success: true, message: 'Invitados obtenidos', data: guests.map(g => g.toJSON()) });
  });

  static createGuest = asyncHandler(async (req: Request, res: Response) => {
    const input = validate<{ fullName: string; month: number; day: number; formId?: string | null }>(
      guestSchema,
      req.body
    );
    // Día calendario real (29/02 vale; 31/04 no). Año bisiesto fijo para permitir el 29/02.
    const probe = new Date(Date.UTC(2024, input.month - 1, input.day));
    if (probe.getUTCMonth() !== input.month - 1) {
      throw new ValidationError('El día no existe en ese mes');
    }
    const guest = await BirthdayGuest.create({
      fullName: input.fullName,
      month: input.month,
      day: input.day,
      formId: input.formId || null,
      createdBy: (req.user as IAuthUser).userId,
    });
    res.status(201).json({ success: true, message: 'Invitado agregado', data: guest.toJSON() });
  });

  static deleteGuest = asyncHandler(async (req: Request, res: Response) => {
    const deleted = mongoose.Types.ObjectId.isValid(req.params.id)
      ? await BirthdayGuest.findByIdAndDelete(req.params.id)
      : null;
    if (!deleted) throw new NotFoundError('Invitado');
    res.json({ success: true, message: 'Invitado eliminado' });
  });
}
