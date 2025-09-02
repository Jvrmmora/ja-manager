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
    .allow('') // Permitir string vacío
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
    .valid('masculino', 'femenino', '')
    .optional()
    .allow('')
    .messages({
      'any.only': 'El género debe ser masculino, femenino o no especificado',
    }),

  role: Joi.string()
    .valid(
      'lider juvenil',
      'simpatizante',
      'joven adventista',
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
    .optional()
    .allow('', null)
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
    .default([])
    .optional(),
  
  group: Joi.number().integer().min(1).max(5).optional().messages({
    'number.base': 'El grupo debe ser un número',
    'number.min': 'El grupo debe ser entre 1 y 5',
    'number.max': 'El grupo debe ser entre 1 y 5',
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
    .valid('masculino', 'femenino', '')
    .optional()
    .allow('')
    .messages({
      'any.only': 'El género debe ser masculino, femenino o no especificado',
    }),

  role: Joi.string()
    .valid(
      'lider juvenil',
      'simpatizante',
      'joven adventista',
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
    .allow('', null)
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
  group: Joi.number().integer().min(1).max(5).optional().messages({
    'number.base': 'El grupo debe ser un número',
    'number.min': 'El grupo debe ser entre 1 y 5',
    'number.max': 'El grupo debe ser entre 1 y 5',
  }),
});

export const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).optional().allow(''),
  ageRange: Joi.string()
    .valid('13-15', '16-18', '19-21', '22-25', '26-30', '30+')
    .optional()
    .allow(''),
  gender: Joi.string()
    .valid('masculino', 'femenino')
    .optional()
    .allow(''),
  role: Joi.string()
    .valid(
      'lider juvenil',
      'simpatizante',
      'colaborador', 
      'joven adventista',
      'director',
      'subdirector',
      'club guias',
      'club conquistadores',
      'club aventureros',
      'escuela sabatica'
    )
    .optional()
    .allow(''),
  sortBy: Joi.string()
    .valid('fullName', 'birthday', 'email', 'role', 'gender', 'createdAt', 'updatedAt')
    .default('fullName'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('asc'),
  groups: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().valid('1', '2', '3', '4', '5')),
      Joi.string().valid('1', '2', '3', '4', '5')
    )
    .optional()
    .messages({
      'alternatives.match': 'Los grupos deben ser números entre 1 y 5',
    }),
});
