import Joi from 'joi';
import {
  CONDITION_OPS,
  CONTACT_FIELDS,
  CONTACT_FIELD_MODES,
  QUESTION_TYPES,
} from '../services/forms/domain/types';
import { FORM_TEMPLATES } from '../services/forms/domain/templates';
import { FORM_STATUSES } from '../models/Form';

/**
 * Esquemas Joi del módulo de formularios. Validan FORMA (tipos, tamaños);
 * la coherencia (condiciones, opciones) la valida validateFormStructure al
 * publicar, porque un borrador puede estar incompleto.
 */

const id = Joi.string().trim().min(1).max(64);

const condition = Joi.object({
  questionId: id.required(),
  op: Joi.string().valid(...CONDITION_OPS).required(),
  value: Joi.string().trim().max(64).required(),
}).allow(null);

const question = Joi.object({
  id: id.required(),
  type: Joi.string().valid(...QUESTION_TYPES).required(),
  label: Joi.string().trim().max(300).allow('').default(''),
  help: Joi.string().trim().max(500).allow('').optional(),
  required: Joi.boolean().default(false),
  options: Joi.array()
    .items(Joi.object({ id: id.required(), label: Joi.string().trim().max(200).allow('').default('') }))
    .max(50)
    .default([]),
  validation: Joi.object({
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    maxLength: Joi.number().integer().min(1).max(3000).optional(),
  }).optional(),
  showIf: condition.optional(),
});

const section = Joi.object({
  id: id.required(),
  title: Joi.string().trim().max(200).allow('').default(''),
  description: Joi.string().trim().max(1000).allow('').default(''),
  showIf: condition.optional(),
  questions: Joi.array().items(question).max(100).default([]),
});

const nullableDate = Joi.date().iso().allow(null);

export const createFormSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120).required().messages({
    'string.empty': 'El título es obligatorio',
    'string.min': 'El título debe tener al menos 3 caracteres',
  }),
  template: Joi.string().valid(...FORM_TEMPLATES).default('event'),
});

export const updateFormSchema = Joi.object({
  title: Joi.string().trim().min(3).max(120),
  description: Joi.string().max(20000).allow(''),
  coverImage: Joi.string().uri().max(1000).allow(null, ''),
  event: Joi.object({
    startsAt: nullableDate,
    endsAt: nullableDate,
    location: Joi.string().trim().max(200).allow(''),
    mapsUrl: Joi.string().trim().uri({ scheme: ['https', 'http'] }).max(500).allow(''),
    cost: Joi.number().min(0).max(100000000).allow(null),
    costNote: Joi.string().trim().max(200).allow(''),
  }),
  closesAt: nullableDate,
  capacity: Joi.number().integer().min(1).max(100000).allow(null),
  contactFields: Joi.array()
    .items(
      Joi.object({
        field: Joi.string().valid(...CONTACT_FIELDS).required(),
        mode: Joi.string().valid(...CONTACT_FIELD_MODES).required(),
      })
    )
    .unique('field')
    .max(CONTACT_FIELDS.length),
  sections: Joi.array().items(section).min(1).max(30),
  attendanceQuestionId: id.allow(null),
  settings: Joi.object({
    allowGuests: Joi.boolean(),
    pointsReward: Joi.number().integer().min(0).max(500),
    showRegisterCta: Joi.boolean(),
  }),
}).min(1);

export const formStatusSchema = Joi.object({
  status: Joi.string().valid(...FORM_STATUSES).required(),
});

export const placaIdentifySchema = Joi.object({
  placa: Joi.string().trim().max(20).required().messages({
    'string.empty': 'Escribe tu placa',
    'any.required': 'Escribe tu placa',
  }),
});

const answerValue = Joi.alternatives().try(
  Joi.string().max(3000).allow(''),
  Joi.number(),
  Joi.array().items(Joi.string().max(64)).max(50)
);

export const submitResponseSchema = Joi.object({
  placa: Joi.string().trim().max(20).allow('', null).optional(),
  contact: Joi.object()
    .pattern(Joi.string().valid(...CONTACT_FIELDS), Joi.alternatives().try(Joi.string().max(254).allow(''), Joi.number()))
    .default({}),
  answers: Joi.object().pattern(id, answerValue).max(300).default({}),
  acceptPolicy: Joi.boolean().optional(),
  saveToProfile: Joi.boolean().optional(),
});

export const responseListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  search: Joi.string().trim().max(100).allow(''),
  attending: Joi.string().valid('yes', 'no', 'unknown'),
  kind: Joi.string().valid('session', 'placa', 'guest'),
});
