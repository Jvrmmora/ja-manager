import Joi from 'joi';

export const createYoungSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El nombre completo es obligatorio',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
    }),

  ageRange: Joi.string()
    .valid('13-15', '16-18', '19-21', '22-25', '26-30', '30+')
    .required()
    .messages({
      'any.only': 'Rango de edad no válido',
      'any.required': 'El rango de edad es obligatorio',
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[\+]?[\d\s\-\(\)]{8,15}$/)
    .required()
    .messages({
      'string.pattern.base': 'Formato de teléfono no válido',
      'any.required': 'El teléfono es obligatorio',
    }),

  birthday: Joi.date()
    .max('now')
    .min(new Date(Date.now() - 50 * 365 * 24 * 60 * 60 * 1000)) // Máximo 50 años atrás
    .required()
    .messages({
      'date.max': 'La fecha de cumpleaños no puede ser futura',
      'date.min': 'La fecha de cumpleaños es muy antigua',
      'any.required': 'La fecha de cumpleaños es obligatoria',
    }),

  profileImage: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'La URL de la imagen no es válida',
    }),
});

export const updateYoungSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede exceder 100 caracteres',
    }),

  ageRange: Joi.string()
    .valid('13-15', '16-18', '19-21', '22-25', '26-30', '30+')
    .optional()
    .messages({
      'any.only': 'Rango de edad no válido',
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[\+]?[\d\s\-\(\)]{8,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Formato de teléfono no válido',
    }),

  birthday: Joi.date()
    .max('now')
    .min(new Date(Date.now() - 50 * 365 * 24 * 60 * 60 * 1000))
    .optional()
    .messages({
      'date.max': 'La fecha de cumpleaños no puede ser futura',
      'date.min': 'La fecha de cumpleaños es muy antigua',
    }),

  profileImage: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'La URL de la imagen no es válida',
    }),
});

export const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).optional(),
  ageRange: Joi.string()
    .valid('13-15', '16-18', '19-21', '22-25', '26-30', '30+')
    .optional(),
  sortBy: Joi.string()
    .valid('fullName', 'birthday', 'createdAt')
    .default('fullName'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc'),
});
