import { ContactField, ContactFieldConfig, ContactSnapshot } from './types';

const PHONE_REGEX = /^[+]?[\d\s\-()]{8,15}$/; // mismo patrón que Young.phone
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const AGE_RANGES = ['13-15', '16-18', '19-21', '22-25', '26-30', '30+'];
const GENDERS = ['masculino', 'femenino'];

export const CONTACT_FIELD_LABELS: Record<ContactField, string> = {
  fullName: 'Nombre completo',
  phone: 'Teléfono',
  email: 'Correo',
  birthday: 'Fecha de nacimiento',
  ageRange: 'Rango de edad',
  gender: 'Género',
  group: 'Grupo',
};

type Parsed = { value: string | number } | { error: string };

/** Normaliza y valida un dato de contacto escrito a mano. */
export const parseContactValue = (field: ContactField, raw: unknown): Parsed => {
  const text = typeof raw === 'string' ? raw.trim() : raw;
  switch (field) {
    case 'fullName':
      if (typeof text !== 'string' || text.length < 2 || text.length > 100) {
        return { error: 'Escribe tu nombre completo (2 a 100 caracteres)' };
      }
      return { value: text.replace(/\s+/g, ' ') };
    case 'phone':
      if (typeof text !== 'string' || !PHONE_REGEX.test(text)) {
        return { error: 'Teléfono no válido' };
      }
      return { value: text };
    case 'email':
      if (typeof text !== 'string' || text.length > 254 || !EMAIL_REGEX.test(text)) {
        return { error: 'Correo no válido' };
      }
      return { value: text.toLowerCase() };
    case 'birthday': {
      if (typeof text !== 'string' || !DATE_REGEX.test(text)) return { error: 'Fecha no válida' };
      const date = new Date(`${text}T12:00:00Z`);
      if (Number.isNaN(date.getTime()) || date > new Date()) return { error: 'Fecha no válida' };
      return { value: text };
    }
    case 'ageRange':
      if (typeof text !== 'string' || !AGE_RANGES.includes(text)) {
        return { error: 'Rango de edad no válido' };
      }
      return { value: text };
    case 'gender':
      if (typeof text !== 'string' || !GENDERS.includes(text)) return { error: 'Género no válido' };
      return { value: text };
    case 'group': {
      const num = Number(text);
      if (!Number.isInteger(num) || num < 1 || num > 5) return { error: 'Grupo no válido (1 a 5)' };
      return { value: num };
    }
    default:
      return { error: 'Campo no soportado' };
  }
};

const hasValue = (value: unknown) =>
  value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '');

export interface ContactResolution {
  snapshot: ContactSnapshot;
  /** Campos que salieron del perfil del joven (no se pidieron). */
  fromProfile: ContactField[];
  /** Campos obligatorios que el perfil no tiene y hay que pedir. */
  missing: ContactField[];
  errors: Partial<Record<ContactField, string>>;
}

/**
 * Arma los datos de contacto de una respuesta.
 * - Lo que ya está en el perfil gana: no se puede suplantar escribiendo otro valor.
 * - Lo que falta se toma de `provided` (lo que escribió la persona).
 * - Un obligatorio que siga vacío queda en `missing` + `errors`.
 * Con `profile = null` (invitado) todo sale de `provided`.
 */
export const resolveContact = (
  config: ContactFieldConfig[],
  profile: ContactSnapshot | null,
  provided: Record<string, unknown> = {}
): ContactResolution => {
  const snapshot: ContactSnapshot = {};
  const fromProfile: ContactField[] = [];
  const missing: ContactField[] = [];
  const errors: Partial<Record<ContactField, string>> = {};

  for (const { field, mode } of config) {
    if (mode === 'hidden') continue;

    const profileValue = profile?.[field];
    if (hasValue(profileValue)) {
      (snapshot as Record<string, unknown>)[field] = profileValue;
      fromProfile.push(field);
      continue;
    }

    const raw = provided[field];
    if (!hasValue(raw)) {
      if (mode === 'required') {
        missing.push(field);
        errors[field] = `${CONTACT_FIELD_LABELS[field]} es obligatorio`;
      }
      continue;
    }

    const parsed = parseContactValue(field, raw);
    if ('error' in parsed) errors[field] = parsed.error;
    else (snapshot as Record<string, unknown>)[field] = parsed.value;
  }

  return { snapshot, fromProfile, missing, errors };
};

/** Campos obligatorios que el perfil no cubre (para pedirlos en pantalla). */
export const missingProfileFields = (
  config: ContactFieldConfig[],
  profile: ContactSnapshot
): ContactField[] =>
  config
    .filter(c => c.mode === 'required' && !hasValue(profile[c.field]))
    .map(c => c.field);
