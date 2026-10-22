import * as xlsx from 'xlsx';
import mongoose from 'mongoose';
import Form, { FormStatus, IFormDocument } from '../../models/Form';
import FormResponse from '../../models/FormResponse';
import { pointsService } from '../pointsService';
import { uploadLandingMediaToCloudinary } from '../../config/cloudinary';
import logger from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errorHandler';
import { flattenQuestions } from './domain/conditions';
import { occupiesSeat } from './domain/availability';
import { buildColumns, buildRow } from './domain/rowMapper';
import { generateFormSlug } from './domain/slug';
import { validateFormStructure } from './domain/structure';
import { buildTemplate, FormTemplateName } from './domain/templates';
import { CHOICE_TYPES } from './domain/types';

/** Campos editables desde el constructor (ya validados con Joi). */
export interface FormUpdateInput {
  title?: string;
  description?: string;
  coverImage?: string | null;
  event?: Record<string, unknown>;
  closesAt?: Date | null;
  capacity?: number | null;
  contactFields?: IFormDocument['contactFields'];
  sections?: IFormDocument['sections'];
  attendanceQuestionId?: string | null;
  settings?: Partial<IFormDocument['settings']>;
}

const STRUCTURE_KEYS: (keyof FormUpdateInput)[] = ['contactFields', 'sections', 'attendanceQuestionId'];

const assertObjectId = (id: string, resource: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new NotFoundError(resource);
};

export const getFormOrFail = async (id: string): Promise<IFormDocument> => {
  assertObjectId(id, 'Formulario');
  const form = await Form.findOne({ _id: id, deletedAt: null });
  if (!form) throw new NotFoundError('Formulario');
  return form;
};

const assertPublishable = (form: IFormDocument) => {
  const problems = validateFormStructure(form);
  if (problems.length) {
    throw new ValidationError('El formulario tiene problemas que impiden publicarlo', { problems });
  }
};

/** Lista con contadores de respuestas (una sola agregación para todos). */
export const listForms = async () => {
  const forms = await Form.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
  const counts = await FormResponse.aggregate([
    { $match: { formId: { $in: forms.map(f => f._id) } } },
    {
      $group: {
        _id: '$formId',
        total: { $sum: 1 },
        attending: { $sum: { $cond: [{ $eq: ['$attending', true] }, 1, 0] } },
      },
    },
  ]);
  const byForm = new Map(counts.map(c => [String(c._id), c]));

  return forms.map(form => {
    const count = byForm.get(String(form._id));
    return {
      id: String(form._id),
      title: form.title,
      slug: form.slug,
      status: form.status,
      coverImage: form.coverImage,
      event: form.event,
      closesAt: form.closesAt,
      capacity: form.capacity,
      seatsTaken: form.seatsTaken,
      hasAttendanceQuestion: !!form.attendanceQuestionId,
      responses: count?.total || 0,
      attending: count?.attending || 0,
      sheetsEnabled: !!form.sheets?.enabled,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
    };
  });
};

export const createForm = async (
  input: { title: string; template?: FormTemplateName },
  adminId: string
) => {
  const template = buildTemplate(input.template || 'event');
  return Form.create({
    title: input.title,
    slug: generateFormSlug(input.title),
    ...template,
    createdBy: mongoose.Types.ObjectId.isValid(adminId) ? adminId : undefined,
  });
};

export const updateForm = async (id: string, input: FormUpdateInput) => {
  const form = await getFormOrFail(id);
  const structureChanged = STRUCTURE_KEYS.some(key => input[key] !== undefined);

  const { event, settings, ...rest } = input;
  form.set(rest);
  if (event) form.set('event', { ...(form.toObject().event || {}), ...event });
  if (settings) form.set('settings', { ...(form.toObject().settings || {}), ...settings });

  // Publicado: no se permite dejarlo en un estado incoherente
  if (form.status !== 'DRAFT' && structureChanged) assertPublishable(form);
  if (structureChanged && form.sheets.enabled) form.sheets.needsFullResync = true;

  await form.save();
  return form;
};

export const setFormStatus = async (id: string, status: FormStatus) => {
  const form = await getFormOrFail(id);
  if (status === 'OPEN') {
    assertPublishable(form);
    if (!form.publishedAt) form.publishedAt = new Date();
    // Reabrir un formulario vencido sin cambiar la fecha lo cerraría de nuevo
    if (form.closesAt && form.closesAt <= new Date()) form.closesAt = null;
  }
  form.status = status;
  await form.save();
  return form;
};

export const duplicateForm = async (id: string, adminId: string) => {
  const source = await getFormOrFail(id);
  const data = source.toObject();
  const title = `${data.title} (copia)`.slice(0, 120);
  return Form.create({
    title,
    slug: generateFormSlug(data.title),
    description: data.description,
    coverImage: data.coverImage,
    event: data.event,
    capacity: data.capacity,
    contactFields: data.contactFields,
    sections: data.sections,
    attendanceQuestionId: data.attendanceQuestionId,
    settings: data.settings,
    createdBy: mongoose.Types.ObjectId.isValid(adminId) ? adminId : undefined,
  });
};

export const deleteForm = async (id: string) => {
  const form = await getFormOrFail(id);
  form.deletedAt = new Date();
  form.status = 'CLOSED';
  await form.save();
};

export interface ResponseListQuery {
  page?: number;
  limit?: number;
  search?: string;
  attending?: 'yes' | 'no' | 'unknown';
  kind?: 'session' | 'placa' | 'guest';
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listResponses = async (id: string, query: ResponseListQuery) => {
  const form = await getFormOrFail(id);
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(200, Math.max(1, query.limit || 50));

  const filter: Record<string, unknown> = { formId: form._id };
  if (query.kind) filter['respondent.kind'] = query.kind;
  if (query.attending === 'yes') filter.attending = true;
  if (query.attending === 'no') filter.attending = false;
  if (query.attending === 'unknown') filter.attending = null;
  if (query.search?.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [
      { 'respondent.contact.fullName': regex },
      { 'respondent.contact.phone': regex },
      { 'respondent.contact.email': regex },
      { 'respondent.placa': regex },
    ];
  }

  const [items, total] = await Promise.all([
    FormResponse.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    FormResponse.countDocuments(filter),
  ]);

  return {
    items: items.map(item => item.toJSON()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Resumen tipo Google Forms: totales, asistencia, tipo de respondedor y
 * conteo por opción de cada pregunta de selección.
 */
export const getFormStats = async (id: string) => {
  const form = await getFormOrFail(id);
  const responses = await FormResponse.find({ formId: form._id })
    .select('answers attending respondent.kind')
    .lean();

  const byKind = { session: 0, placa: 0, guest: 0 };
  const attendance = { yes: 0, no: 0, unknown: 0 };
  for (const r of responses) {
    byKind[r.respondent.kind] += 1;
    if (r.attending === true) attendance.yes += 1;
    else if (r.attending === false) attendance.no += 1;
    else attendance.unknown += 1;
  }

  const questions = flattenQuestions(form)
    .filter(q => CHOICE_TYPES.includes(q.type))
    .map(q => {
      const options = q.type === 'yes_no'
        ? [{ id: 'yes', label: 'Sí' }, { id: 'no', label: 'No' }]
        : q.options || [];
      const counts = Object.fromEntries(options.map(o => [o.id, 0]));
      let answered = 0;
      for (const r of responses) {
        const value = (r.answers as Record<string, unknown>)?.[q.id];
        if (value === undefined) continue;
        answered += 1;
        for (const id of Array.isArray(value) ? value : [value]) {
          if (counts[id as string] !== undefined) counts[id as string] += 1;
        }
      }
      return {
        questionId: q.id,
        label: q.label,
        type: q.type,
        answered,
        options: options.map(o => ({ id: o.id, label: o.label, count: counts[o.id] })),
      };
    });

  return {
    total: responses.length,
    attendance,
    byKind,
    seatsTaken: form.seatsTaken,
    capacity: form.capacity,
    questions,
  };
};

export const deleteResponse = async (formId: string, responseId: string) => {
  const form = await getFormOrFail(formId);
  assertObjectId(responseId, 'Respuesta');
  const response = await FormResponse.findOneAndDelete({ _id: responseId, formId: form._id });
  if (!response) throw new NotFoundError('Respuesta');

  if (occupiesSeat(response.attending)) {
    await Form.updateOne({ _id: form._id, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });
  }
  // Borrar una respuesta (spam, duplicado) también revierte sus puntos
  if (response.pointsTransactionId) {
    try {
      await pointsService.deleteTransaction(String(response.pointsTransactionId));
    } catch (error: any) {
      logger.warn('No se pudo revertir la transacción de puntos del formulario', {
        context: 'FormService',
        responseId,
        error: error?.message,
      });
    }
  }
  if (form.sheets.enabled) {
    await Form.updateOne({ _id: form._id }, { $set: { 'sheets.needsFullResync': true } });
  }
};

/** Todas las filas (encabezado incluido) en el mismo formato que Sheets. */
export const buildResponseTable = async (form: IFormDocument): Promise<string[][]> => {
  const columns = buildColumns(form);
  const responses = await FormResponse.find({ formId: form._id }).sort({ createdAt: 1 }).lean();
  return [
    columns.map(c => c.label),
    ...responses.map(r =>
      buildRow(form, columns, {
        submittedAt: r.createdAt as Date,
        kind: r.respondent.kind,
        placa: r.respondent.placa,
        contact: r.respondent.contact || {},
        answers: (r.answers as Record<string, any>) || {},
      })
    ),
  ];
};

export const exportResponsesXlsx = async (id: string) => {
  const form = await getFormOrFail(id);
  const table = await buildResponseTable(form);
  const sheet = xlsx.utils.aoa_to_sheet(table);
  sheet['!cols'] = table[0].map(header => ({ wch: Math.min(40, Math.max(12, header.length + 2)) }));
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, sheet, 'Respuestas');
  const buffer: Buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { buffer, filename: `${form.slug}-respuestas.xlsx` };
};

export const uploadCoverImage = async (file?: Express.Multer.File) => {
  if (!file) throw new ValidationError('No hay imagen para subir');
  return uploadLandingMediaToCloudinary(file.buffer, 'image', 'forms');
};
