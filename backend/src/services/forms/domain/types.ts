/**
 * Tipos del dominio de formularios. Son planos (sin Mongoose) para que la
 * lógica pura —condiciones, validación, identidad— se pruebe sin base de datos.
 */

export const QUESTION_TYPES = [
  'short_text',
  'paragraph',
  'single_choice',
  'multi_choice',
  'dropdown',
  'yes_no',
  'date',
  'number',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Tipos con opciones fijas: son los únicos que pueden disparar condiciones. */
export const CHOICE_TYPES: readonly QuestionType[] = [
  'single_choice',
  'multi_choice',
  'dropdown',
  'yes_no',
];

export const CONDITION_OPS = ['equals', 'not_equals', 'includes'] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export interface FormCondition {
  questionId: string;
  op: ConditionOp;
  /** id de opción, o 'yes' / 'no' para preguntas yes_no */
  value: string;
}

export interface FormOption {
  id: string;
  label: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required: boolean;
  options?: FormOption[];
  validation?: { min?: number; max?: number; maxLength?: number };
  showIf?: FormCondition | null;
}

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  showIf?: FormCondition | null;
  questions: FormQuestion[];
}

/** Datos de contacto que se pueden autollenar desde el perfil del joven. */
export const CONTACT_FIELDS = [
  'fullName',
  'phone',
  'email',
  'birthday',
  'ageRange',
  'gender',
  'group',
] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const CONTACT_FIELD_MODES = ['required', 'optional', 'hidden'] as const;
export type ContactFieldMode = (typeof CONTACT_FIELD_MODES)[number];

export interface ContactFieldConfig {
  field: ContactField;
  mode: ContactFieldMode;
}

export interface ContactSnapshot {
  fullName?: string;
  phone?: string;
  email?: string;
  /** YYYY-MM-DD */
  birthday?: string;
  ageRange?: string;
  gender?: string;
  group?: number;
}

export type AnswerValue = string | string[] | number;
export type AnswerMap = Record<string, AnswerValue>;

/** Lo mínimo del formulario que necesita la lógica pura. */
export interface FormDefinition {
  contactFields: ContactFieldConfig[];
  sections: FormSection[];
  attendanceQuestionId?: string | null;
}
