import crypto from 'crypto';
import mongoose from 'mongoose';
import Form, { IFormDocument } from '../../models/Form';
import FormResponse, { IFormResponseDocument } from '../../models/FormResponse';
import Young from '../../models/Young';
import { pointsService } from '../pointsService';
import env from '../../config/env';
import logger from '../../utils/logger';
import { formatDateColombia } from '../../utils/dateUtils';
import { normalizePlaca, PLACA_REGEX } from '../../utils/placa';
import {
  AppError,
  ConflictError,
  ErrorType,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../utils/errorHandler';
import { validateAnswers } from './domain/answerValidation';
import { getAvailability, occupiesSeat, spotsLeft } from './domain/availability';
import { missingProfileFields, resolveContact } from './domain/identity';
import { maskEmail, maskPhone, shortName } from './domain/mask';
import { RespondentKind } from './domain/rowMapper';
import { ContactField, ContactSnapshot } from './domain/types';
import { notifyResponseSaved } from './formHooks';

/** Campos del perfil que el joven puede completar desde un formulario. */
const PROFILE_FILLABLE: ContactField[] = ['phone', 'email', 'birthday', 'gender'];

const activeYoungFilter = { deletedAt: null, isSpam: { $ne: true } };

const placaNotFound = () =>
  new AppError('No encontramos esa placa. Revísala o responde como invitado', ErrorType.NOT_FOUND, 404);

export interface Requester {
  userId: string;
  /** Scopes del rol (vienen de optionalAuth). */
  scopes?: string[];
}

export interface SubmitPayload {
  placa?: string;
  contact?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  acceptPolicy?: boolean;
  saveToProfile?: boolean;
}

/** Datos del Young en el mismo formato que usa la lógica de contacto. */
export const toContactProfile = (young: any): ContactSnapshot => ({
  fullName: young.fullName || undefined,
  phone: young.phone || undefined,
  email: young.email || undefined,
  birthday: young.birthday ? formatDateColombia(young.birthday) : undefined,
  ageRange: young.ageRange || undefined,
  gender: young.gender || undefined,
  group: young.group || undefined,
});

const canManageForms = (requester?: Requester) =>
  !!requester?.scopes?.includes('forms:manage');

const hashIp = (ip?: string) =>
  ip ? crypto.createHmac('sha256', env.jwtSecret).update(ip).digest('hex').slice(0, 32) : undefined;

/** Lo que ve el público del formulario (sin datos de administración). */
export const toPublicForm = (form: IFormDocument) => ({
  id: String(form._id),
  slug: form.slug,
  title: form.title,
  description: form.description,
  coverImage: form.coverImage,
  event: form.event,
  status: form.status,
  closesAt: form.closesAt,
  spotsLeft: spotsLeft(form),
  contactFields: form.contactFields.filter(c => c.mode !== 'hidden'),
  sections: form.sections,
  settings: {
    allowGuests: form.settings.allowGuests,
    pointsReward: form.settings.pointsReward,
    showRegisterCta: form.settings.showRegisterCta,
  },
});

const findFormBySlug = async (slug: string, requester?: Requester) => {
  const form = await Form.findOne({ slug, deletedAt: null });
  // Un borrador solo lo ve quien administra formularios (vista previa)
  if (!form || (form.status === 'DRAFT' && !canManageForms(requester))) {
    throw new NotFoundError('Formulario');
  }
  return form;
};

const findYoungResponse = (formId: unknown, youngId: unknown) =>
  FormResponse.findOne({ formId, 'respondent.youngId': youngId });

/**
 * GET público. Con sesión agrega los datos del propio joven (completos: son
 * suyos) y su respuesta previa, para autollenar y permitir editar.
 */
export const getPublicForm = async (slug: string, requester?: Requester) => {
  const form = await findFormBySlug(slug, requester);
  const availability = getAvailability(form);

  let me = null;
  let myResponse = null;
  if (requester) {
    const young = await Young.findOne({ _id: requester.userId, ...activeYoungFilter });
    if (young) {
      const profile = toContactProfile(young);
      const visible = form.contactFields.filter(c => c.mode !== 'hidden');
      me = {
        fullName: young.fullName,
        shortName: shortName(young.fullName),
        placa: young.placa || null,
        profileImage: young.profileImage || null,
        contact: Object.fromEntries(
          visible.map(c => [c.field, profile[c.field] ?? null])
        ),
        missing: missingProfileFields(form.contactFields, profile),
      };
      const previous = await findYoungResponse(form._id, young._id);
      if (previous) {
        myResponse = {
          answers: previous.answers,
          contact: previous.respondent.contact,
          updatedAt: previous.updatedAt,
        };
      }
    }
  }

  return { form: toPublicForm(form), availability, me, myResponse };
};

/**
 * Identificación por placa SIN sesión. Solo revela lo justo para que el
 * dueño se reconozca (nombre corto + datos enmascarados) y qué falta pedir.
 */
export const identifyByPlaca = async (slug: string, rawPlaca: unknown) => {
  const form = await findFormBySlug(slug);
  const placa = normalizePlaca(rawPlaca);
  if (!PLACA_REGEX.test(placa)) {
    throw new ValidationError('Formato de placa inválido. Ej: @MODPRUE001');
  }

  const young = await Young.findOne({ placa, ...activeYoungFilter });
  if (!young) throw placaNotFound();

  const profile = toContactProfile(young);
  const visible = form.contactFields.filter(c => c.mode !== 'hidden').map(c => c.field);
  const alreadyResponded = !!(await findYoungResponse(form._id, young._id));

  return {
    placa,
    shortName: shortName(young.fullName),
    masked: {
      phone: visible.includes('phone') ? maskPhone(profile.phone) : null,
      email: visible.includes('email') ? maskEmail(profile.email) : null,
    },
    saved: visible.filter(field => profile[field] !== undefined),
    missing: missingProfileFields(form.contactFields, profile),
    alreadyResponded,
  };
};

const attendanceFrom = (form: IFormDocument, answers: Record<string, unknown>) => {
  const id = form.attendanceQuestionId;
  if (!id || answers[id] === undefined) return null;
  return answers[id] === 'yes';
};

/** Reserva un cupo de forma atómica; false si ya no hay. */
const reserveSeat = async (formId: unknown): Promise<boolean> => {
  const updated = await Form.findOneAndUpdate(
    {
      _id: formId,
      $or: [{ capacity: null }, { $expr: { $lt: ['$seatsTaken', '$capacity'] } }],
    },
    { $inc: { seatsTaken: 1 } }
  );
  return !!updated;
};

const releaseSeat = (formId: unknown) =>
  Form.updateOne({ _id: formId, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } });

const awardPointsOnce = async (
  form: IFormDocument,
  response: IFormResponseDocument
): Promise<number> => {
  const youngId = response.respondent.youngId;
  if (!youngId || form.settings.pointsReward <= 0 || response.pointsTransactionId) return 0;
  try {
    const tx = await pointsService.createTransaction({
      youngId: String(youngId),
      points: form.settings.pointsReward,
      type: 'FORM_RESPONSE',
      description: `Formulario: ${form.title}`,
    });
    response.pointsTransactionId = tx._id as mongoose.Types.ObjectId;
    await response.save();
    return form.settings.pointsReward;
  } catch (error: any) {
    // Sin temporada activa no hay puntos, pero la respuesta sí se guarda
    logger.warn('No se pudieron otorgar puntos por formulario', {
      context: 'FormResponseService',
      formId: String(form._id),
      error: error?.message,
    });
    return 0;
  }
};

/** Completa en el perfil SOLO campos vacíos y solo para quien tiene sesión. */
const fillMissingProfile = async (young: any, snapshot: ContactSnapshot, fields: ContactField[]) => {
  const $set: Record<string, unknown> = {};
  for (const field of fields) {
    if (!PROFILE_FILLABLE.includes(field) || snapshot[field] === undefined) continue;
    $set[field] = field === 'birthday' ? new Date(`${snapshot.birthday}T12:00:00Z`) : snapshot[field];
  }
  if (Object.keys($set).length === 0) return;
  try {
    await Young.updateOne({ _id: young._id }, { $set });
  } catch (error: any) {
    // p.ej. correo ya usado por otra cuenta: no bloquea la respuesta
    logger.warn('No se pudo completar el perfil desde el formulario', {
      context: 'FormResponseService',
      youngId: String(young._id),
      error: error?.message,
    });
  }
};

/**
 * Envía una respuesta. Identidad: sesión > placa > invitado.
 * Si el joven ya respondió, se actualiza su respuesta (nunca se duplica).
 */
export const submitResponse = async (
  slug: string,
  payload: SubmitPayload,
  requester?: Requester,
  meta: { ip?: string } = {}
) => {
  const form = await findFormBySlug(slug, requester);
  const availability = getAvailability(form);
  if (availability === 'draft' && !canManageForms(requester)) throw new NotFoundError('Formulario');
  if (availability === 'closed') throw new ConflictError('Este formulario ya no recibe respuestas');

  // 1) ¿Quién responde?
  let kind: RespondentKind = 'guest';
  let young: any = null;
  if (requester) {
    young = await Young.findOne({ _id: requester.userId, ...activeYoungFilter });
    if (!young) throw new UnauthorizedError('Tu sesión no es válida, vuelve a iniciar sesión');
    kind = 'session';
  } else if (payload.placa) {
    const placa = normalizePlaca(payload.placa);
    if (!PLACA_REGEX.test(placa)) throw new ValidationError('Formato de placa inválido');
    young = await Young.findOne({ placa, ...activeYoungFilter });
    if (!young) throw placaNotFound();
    kind = 'placa';
  } else {
    if (!form.settings.allowGuests) {
      throw new ForbiddenError('Este formulario es solo para jóvenes registrados');
    }
    if (payload.acceptPolicy !== true) {
      throw new ValidationError('Debes aceptar el tratamiento de datos personales', {
        contact: { acceptPolicy: 'Debes aceptar el tratamiento de datos personales' },
      });
    }
  }

  // 2) Datos de contacto + respuestas
  const profile = young ? toContactProfile(young) : null;
  const contact = resolveContact(form.contactFields, profile, payload.contact || {});
  const answers = validateAnswers(form, payload.answers || {});
  if (Object.keys(contact.errors).length || Object.keys(answers.errors).length) {
    throw new ValidationError('Revisa los campos marcados', {
      contact: contact.errors,
      answers: answers.errors,
    });
  }
  const attending = attendanceFrom(form, answers.answers);
  const sheetsPending = form.sheets.enabled && !!form.sheets.spreadsheetId;

  // 3) Actualizar si ya respondió
  const existing = young ? await findYoungResponse(form._id, young._id) : null;
  let response: IFormResponseDocument;
  let updated = false;

  if (existing) {
    const wasSeated = occupiesSeat(existing.attending);
    const nowSeated = occupiesSeat(attending);
    if (!wasSeated && nowSeated && !(await reserveSeat(form._id))) {
      throw new ConflictError('Lo sentimos, ya no quedan cupos');
    }
    if (wasSeated && !nowSeated) await releaseSeat(form._id);

    existing.respondent.kind = kind;
    existing.respondent.placa = young?.placa || null;
    existing.respondent.contact = contact.snapshot;
    existing.answers = answers.answers;
    existing.attending = attending;
    existing.markModified('answers');
    existing.markModified('respondent.contact');
    response = await existing.save();
    updated = true;
  } else {
    const seated = occupiesSeat(attending);
    if (seated && !(await reserveSeat(form._id))) {
      throw new ConflictError('Lo sentimos, ya no quedan cupos');
    }
    try {
      response = await FormResponse.create({
        formId: form._id,
        respondent: {
          kind,
          youngId: young?._id || null,
          placa: young?.placa || null,
          contact: contact.snapshot,
        },
        answers: answers.answers,
        attending,
        consentAcceptedAt: kind === 'guest' ? new Date() : null,
        sheetsSync: { status: sheetsPending ? 'pending' : 'skipped', attempts: 0 },
        ipHash: hashIp(meta.ip),
      });
    } catch (error: any) {
      if (seated) await releaseSeat(form._id);
      if (error?.code === 11000) {
        // Doble envío simultáneo del mismo joven
        throw new ConflictError('Ya recibimos tu respuesta, recarga la página para editarla');
      }
      throw error;
    }
  }

  // 4) Efectos secundarios (no bloquean ni revierten la respuesta)
  const pointsAwarded = await awardPointsOnce(form, response);
  if (kind === 'session' && payload.saveToProfile) {
    await fillMissingProfile(young, contact.snapshot, missingProfileFields(form.contactFields, profile!));
  }
  notifyResponseSaved(form, response, { updated });

  return {
    responseId: String(response._id),
    updated,
    kind,
    attending,
    pointsAwarded,
  };
};
