import type { AnswerMap, FormCondition, FormQuestion, FormSection } from '../../types/forms';

/*
 * Espejo de backend/src/services/forms/domain/conditions.ts. El servidor es
 * quien decide al final; esto solo muestra/oculta en pantalla con la misma
 * regla. Si cambias una, cambia la otra (los tests usan los mismos casos).
 */

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

export const evaluateCondition = (condition: FormCondition, answers: AnswerMap): boolean => {
  const value = answers[condition.questionId];
  if (isEmpty(value)) return false;
  const matches = Array.isArray(value)
    ? value.includes(condition.value)
    : String(value) === condition.value;
  return condition.op === 'not_equals' ? !matches : matches;
};

export interface Visibility {
  sections: FormSection[];
  questionIds: Set<string>;
  effectiveAnswers: AnswerMap;
}

/** Secciones y preguntas visibles para las respuestas actuales. */
export const resolveVisibility = (sections: FormSection[], answers: AnswerMap): Visibility => {
  const visibleSections: FormSection[] = [];
  const questionIds = new Set<string>();
  const effectiveAnswers: AnswerMap = {};

  for (const section of sections) {
    if (section.showIf && !evaluateCondition(section.showIf, effectiveAnswers)) continue;
    const questions = section.questions.filter(question => {
      if (question.showIf && !evaluateCondition(question.showIf, effectiveAnswers)) return false;
      questionIds.add(question.id);
      if (!isEmpty(answers[question.id])) effectiveAnswers[question.id] = answers[question.id];
      return true;
    });
    visibleSections.push({ ...section, questions });
  }

  return { sections: visibleSections, questionIds, effectiveAnswers };
};

/** Validación rápida en pantalla (el servidor revalida todo). */
export const validateQuestion = (question: FormQuestion, value: unknown): string | null => {
  if (isEmpty(value)) return question.required ? 'Esta pregunta es obligatoria' : null;
  if (question.type === 'number') {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'Debe ser un número';
    const { min, max } = question.validation || {};
    if (min !== undefined && num < min) return `Mínimo ${min}`;
    if (max !== undefined && num > max) return `Máximo ${max}`;
  }
  if (typeof value === 'string' && question.validation?.maxLength && value.trim().length > question.validation.maxLength) {
    return `Máximo ${question.validation.maxLength} caracteres`;
  }
  return null;
};

export const validateSection = (section: FormSection, answers: AnswerMap): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const question of section.questions) {
    const error = validateQuestion(question, answers[question.id]);
    if (error) errors[question.id] = error;
  }
  return errors;
};
