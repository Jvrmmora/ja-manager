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
    .optional()
    .messages({
      'string.pattern.base': 'Formato de teléfono no válido',
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

  gender: Joi.string()
    .valid('masculino', 'femenino')
    .required()
    .messages({
      'any.only': 'El género debe ser masculino o femenino',
      'any.required': 'El género es obligatorio',
    }),

  role: Joi.string()
    .valid(
      'lider juvenil',
      'colaborador', 
      'director',
      'subdirector',
      'club guias',
      'club conquistadores',
      'club aventureros',
      'escuela sabatica'
    )
    .required()
    .messages({
      'any.only': 'Rol no válido',
      'any.required': 'El rol es obligatorio',
    }),

  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .required()
    .messages({
      'string.email': 'Formato de email no válido',
      'any.required': 'El email es obligatorio',
    }),

  skills: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(2)
        .max(50)
        .messages({
          'string.min': 'Cada habilidad debe tener al menos 2 caracteres',
          'string.max': 'Cada habilidad no puede exceder 50 caracteres',
        })
    )
    .default([])
    .optional(),
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
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Formato de teléfono no válido',
    }),

  birthday: Joi.date()
    .optional()
    .messages({
      'date.base': 'Formato de fecha no válido',
    }),

  profileImage: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
    .messages({
      'string.uri': 'La URL de la imagen no es válida',
    }),

  gender: Joi.string()
    .valid('masculino', 'femenino')
    .optional()
    .messages({
      'any.only': 'El género debe ser masculino o femenino',
    }),

  role: Joi.string()
    .valid(
      'lider juvenil',
      'colaborador', 
      'director',
      'subdirector',
      'club guias',
      'club conquistadores',
      'club aventureros',
      'escuela sabatica'
    )
    .optional()
    .messages({
      'any.only': 'Rol no válido',
    }),

  email: Joi.string()
    .email()
    .trim()
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Formato de email no válido',
    }),

  skills: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(2)
        .max(50)
        .messages({
          'string.min': 'Cada habilidad debe tener al menos 2 caracteres',
          'string.max': 'Cada habilidad no puede exceder 50 caracteres',
        })
    )
    .optional(),
});

export const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).optional(),
  ageRange: Joi.string()
    .valid('13-15', '16-18', '19-21', '22-25', '26-30', '30+')
    .optional(),
  gender: Joi.string()
    .valid('masculino', 'femenino')
    .optional(),
  role: Joi.string()
    .valid(
      'lider juvenil',
      'colaborador', 
      'director',
      'subdirector',
      'club guias',
      'club conquistadores',
      'club aventureros',
      'escuela sabatica'
    )
    .optional(),
  sortBy: Joi.string()
    .valid('fullName', 'birthday', 'email', 'role', 'gender', 'createdAt', 'updatedAt')
    .default('fullName'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc'),
});
