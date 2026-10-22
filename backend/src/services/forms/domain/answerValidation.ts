import { resolveVisibility, flattenQuestions } from './conditions';
import { AnswerMap, AnswerValue, FormDefinition, FormQuestion } from './types';

const DEFAULT_MAX_LENGTH: Partial<Record<FormQuestion['type'], number>> = {
  short_text: 300,
  paragraph: 3000,
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const optionIds = (question: FormQuestion): string[] =>
  question.type === 'yes_no'
    ? ['yes', 'no']
    : (question.options || []).map(option => option.id);

type Parsed = { value: AnswerValue } | { error: string };

/** Convierte y valida el valor crudo de una pregunta según su tipo. */
const parseAnswer = (question: FormQuestion, raw: unknown): Parsed => {
  switch (question.type) {
    case 'short_text':
    case 'paragraph': {
      if (typeof raw !== 'string') return { error: 'Debe ser texto' };
      const text = raw.trim();
      const max = question.validation?.maxLength || DEFAULT_MAX_LENGTH[question.type] || 300;
      if (text.length > max) return { error: `Máximo ${max} caracteres` };
      return { value: text };
    }
    case 'single_choice':
    case 'dropdown':
    case 'yes_no': {
      if (typeof raw !== 'string' || !optionIds(question).includes(raw)) {
        return { error: 'Opción no válida' };
      }
      return { value: raw };
    }
    case 'multi_choice': {
      if (!Array.isArray(raw) || raw.some(item => typeof item !== 'string')) {
        return { error: 'Selección no válida' };
      }
      const valid = optionIds(question);
      const unique = [...new Set(raw as string[])];
      if (unique.some(id => !valid.includes(id))) return { error: 'Opción no válida' };
      return { value: unique };
    }
    case 'number': {
      const num = typeof raw === 'number' ? raw : Number(raw);
      if (typeof raw === 'boolean' || !Number.isFinite(num)) return { error: 'Debe ser un número' };
      const { min, max } = question.validation || {};
      if (min !== undefined && num < min) return { error: `Mínimo ${min}` };
      if (max !== undefined && num > max) return { error: `Máximo ${max}` };
      return { value: num };
    }
    case 'date': {
      if (typeof raw !== 'string' || !DATE_REGEX.test(raw) || Number.isNaN(Date.parse(raw))) {
        return { error: 'Fecha no válida' };
      }
      return { value: raw };
    }
    default:
      return { error: 'Tipo de pregunta no soportado' };
  }
};

export interface AnswerValidationResult {
  answers: AnswerMap;
  /** questionId → mensaje */
  errors: Record<string, string>;
}

/**
 * Valida las respuestas contra el esquema del formulario:
 * - descarta respuestas a preguntas inexistentes u ocultas por condiciones,
 * - exige las obligatorias solo si están visibles.
 */
export const validateAnswers = (
  form: Pick<FormDefinition, 'sections'>,
  raw: Record<string, unknown>
): AnswerValidationResult => {
  const parsed: AnswerMap = {};
  const errors: Record<string, string> = {};

  // 1) parsear todo lo que llegó para poder evaluar condiciones con valores limpios
  for (const question of flattenQuestions(form)) {
    const value = raw?.[question.id];
    if (isEmpty(value)) continue;
    const result = parseAnswer(question, value);
    if ('error' in result) errors[question.id] = result.error;
    else parsed[question.id] = result.value;
  }

  // 2) quedarnos solo con lo visible y exigir obligatorias visibles
  const { visibleQuestionIds, effectiveAnswers } = resolveVisibility(form, parsed);

  for (const question of flattenQuestions(form)) {
    if (!visibleQuestionIds.has(question.id)) {
      delete errors[question.id];
      continue;
    }
    if (question.required && effectiveAnswers[question.id] === undefined && !errors[question.id]) {
      errors[question.id] = 'Esta pregunta es obligatoria';
    }
  }

  return { answers: effectiveAnswers, errors };
};
