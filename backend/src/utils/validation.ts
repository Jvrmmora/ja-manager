import Joi from 'joi';

const AGE_RANGE_BOUNDS: Record<string, { min: number; max: number }> = {
  '13-15': { min: 13, max: 15 },
  '16-18': { min: 16, max: 18 },
  '19-21': { min: 19, max: 21 },
  '22-25': { min: 22, max: 25 },
  '26-30': { min: 26, max: 30 },
  '30+': { min: 30, max: Infinity },
};

/**
 * Edad exacta a partir de la fecha de nacimiento (mismo cálculo que usa
 * consentController para decidir si alguien es menor de edad).
 */
export function calculateAgeFromBirthday(birthday: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthday.getFullYear();
  const monthDiff = now.getMonth() - birthday.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthday.getDate())) {
    age--;
  }
  return age;
}

export function ageMatchesRange(age: number, ageRange: string): boolean {
  const bounds = AGE_RANGE_BOUNDS[ageRange];
  if (!bounds) return true; // rango desconocido: ya lo rechaza el .valid() del campo
  return age >= bounds.min && age <= bounds.max;
}

/**
 * Valida que fecha de nacimiento y rango de edad sean consistentes entre sí.
 * Sin este cruce, un typo en la fecha (ej. seleccionar el año actual por
 * error en el date picker) puede guardarse sin error y, más tarde, hacer que
 * el sistema trate como menor de edad a alguien que no lo es — bloqueándolo
 * para aceptar la política de datos por sí mismo.
 */
function withBirthdayAgeRangeCheck<T extends Joi.ObjectSchema>(schema: T): T {
  return schema.custom((value, helpers) => {
    if (value.birthday && value.ageRange) {
      const age = calculateAgeFromBirthday(new Date(value.birthday));
      if (!ageMatchesRange(age, value.ageRange)) {
        return helpers.message({
          custom: `La fecha de nacimiento no coincide con el rango de edad seleccionado (edad calculada: ${age} años para el rango ${value.ageRange}). Verifica el día, mes y año.`,
        });
      }
    }
    return value;
  }) as T;
}

export const createYoungSchema = withBirthdayAgeRangeCheck(Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
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
    .min(new Date('1925-01-01')) // Acepta desde 1925
    .required()
    .messages({
      'date.max': 'La fecha de cumpleaños no puede ser futura',
      'date.min': 'La fecha de cumpleaños debe ser desde 1925 en adelante',
      'any.required': 'La fecha de cumpleaños es obligatoria',
    }),

  profileImage: Joi.string().uri().optional().allow(null, '').messages({
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
      Joi.string().trim().min(2).max(50).messages({
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
}));

export const updateYoungSchema = withBirthdayAgeRangeCheck(Joi.object({
  fullName: Joi.string().trim().min(2).max(100).optional().messages({
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

  birthday: Joi.date().optional().messages({
    'date.base': 'Formato de fecha no válido',
  }),

  profileImage: Joi.string().uri().optional().allow(null, '').messages({
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
      Joi.string().trim().min(2).max(50).messages({
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
}));

export const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().trim().max(100).optional().allow(''),
  ageRange: Joi.string()
    .valid('13-15', '16-18', '19-21', '22-25', '26-30', '30+')
    .optional()
    .allow(''),
  gender: Joi.string().valid('masculino', 'femenino').optional().allow(''),
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
  status: Joi.string()
    .valid('pending', 'approved', 'rejected')
    .optional()
    .allow(''),
  sortBy: Joi.string()
    .valid(
      'fullName',
      'birthday',
      'email',
      'role',
      'gender',
      'createdAt',
      'updatedAt'
    )
    .default('fullName'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
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

// Esquema para resetear contraseña
export const resetPasswordSchema = Joi.object({
  current_password: Joi.string().min(1).optional().messages({
    'string.empty': 'La contraseña actual no puede estar vacía',
    'string.min': 'La contraseña actual debe tener al menos 1 caracter',
  }),

  new_password: Joi.string()
    .min(8)
    .max(50)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/)
    .required()
    .messages({
      'string.empty': 'La nueva contraseña es obligatoria',
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'string.max': 'La nueva contraseña no puede exceder 50 caracteres',
      'string.pattern.base':
        'La nueva contraseña debe incluir al menos una mayúscula, una minúscula y un número. Caracteres especiales permitidos: @$!%*?&._-+=',
      'any.required': 'La nueva contraseña es obligatoria',
    }),
});

// Esquema para registro parcial (con password y verificación)
export const partialRegistrationSchema = withBirthdayAgeRangeCheck(Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
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
    .allow('')
    .messages({
      'string.pattern.base': 'Formato de teléfono no válido',
    }),

  birthday: Joi.date()
    .max('now')
    .min(new Date('1925-01-01'))
    .required()
    .messages({
      'date.max': 'La fecha de cumpleaños no puede ser futura',
      'date.min': 'La fecha de cumpleaños es muy antigua',
      'any.required': 'La fecha de cumpleaños es obligatoria',
    }),

  profileImage: Joi.string().uri().optional().allow(null, '').messages({
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
    .required()
    .messages({
      'string.email': 'Formato de email no válido',
      'any.required': 'El email es obligatorio para el registro',
    }),

  password: Joi.string()
    .min(8)
    .max(50)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&._\-+=]{8,50}$/)
    .required()
    .messages({
      'string.empty': 'La contraseña es obligatoria',
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.max': 'La contraseña no puede exceder 50 caracteres',
      'string.pattern.base':
        'La contraseña debe incluir al menos una mayúscula, una minúscula y un número. Caracteres especiales permitidos: @$!%*?&._-+=',
      'any.required': 'La contraseña es obligatoria',
    }),

  passwordConfirmation: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'La confirmación de contraseña es obligatoria',
    }),

  skills: Joi.array()
    .items(
      Joi.string().trim().min(2).max(50).messages({
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

  referredByPlaca: Joi.string()
    .trim()
    .pattern(/^@MOD[A-Z]{2,4}\d{3}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Formato de placa de referido no válido',
    }),

  // Consentimiento de tratamiento de datos personales (Ley 1581/2012).
  // Llega como string desde FormData; Joi lo convierte a boolean.
  acceptPrivacyPolicy: Joi.boolean().valid(true).required().messages({
    'any.only': 'Debe aceptar la Política de Privacidad para registrarse',
    'any.required': 'Debe aceptar la Política de Privacidad para registrarse',
    'boolean.base': 'Debe aceptar la Política de Privacidad para registrarse',
  }),

  policyVersion: Joi.string().trim().max(20).required().messages({
    'any.required': 'Falta la versión de la política aceptada',
    'string.empty': 'Falta la versión de la política aceptada',
  }),

  guardianFullName: Joi.string().trim().max(100).optional().allow('', null),

  guardianRelationship: Joi.string().trim().max(60).optional().allow('', null),
}));

// Aceptación de la política vigente por un usuario ya autenticado
export const consentAcceptSchema = Joi.object({
  acceptPrivacyPolicy: Joi.boolean().valid(true).required().messages({
    'any.only': 'Debe aceptar la Política de Privacidad',
    'any.required': 'Debe aceptar la Política de Privacidad',
    'boolean.base': 'Debe aceptar la Política de Privacidad',
  }),
  policyVersion: Joi.string().trim().max(20).required().messages({
    'any.required': 'Falta la versión de la política aceptada',
    'string.empty': 'Falta la versión de la política aceptada',
  }),
  guardianFullName: Joi.string().trim().max(100).optional().allow('', null),
  guardianRelationship: Joi.string().trim().max(60).optional().allow('', null),
});

// Esquema para aprobar/rechazar solicitud
export const reviewRequestSchema = Joi.object({
  status: Joi.string()
    .valid('approved', 'rejected')
    .required()
    .messages({
      'any.only': 'El estado debe ser approved o rejected',
      'any.required': 'El estado es obligatorio',
    }),
  rejectionReason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null)
    .when('status', {
      is: 'rejected',
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    })
    .messages({
      'string.max': 'La razón de rechazo no puede exceder 500 caracteres',
    }),
});

export const contactMessageSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'El nombre es obligatorio',
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es obligatorio',
  }),

  email: Joi.string().email().trim().lowercase().required().messages({
    'string.empty': 'El correo es obligatorio',
    'string.email': 'Formato de correo no valido',
    'any.required': 'El correo es obligatorio',
  }),

  message: Joi.string().trim().min(10).max(2000).required().messages({
    'string.empty': 'El mensaje es obligatorio',
    'string.min': 'El mensaje debe tener al menos 10 caracteres',
    'string.max': 'El mensaje no puede exceder 2000 caracteres',
    'any.required': 'El mensaje es obligatorio',
  }),
});

export const contactMessagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});
