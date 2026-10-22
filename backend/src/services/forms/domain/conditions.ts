import { AnswerMap, FormCondition, FormDefinition, FormQuestion } from './types';

/**
 * Una condición solo se cumple si la pregunta de origen tiene respuesta.
 * Así "Mostrar si ¿Asistirás? ≠ Sí" no aparece antes de que respondan.
 */
export const evaluateCondition = (
  condition: FormCondition,
  answers: AnswerMap
): boolean => {
  const value = answers[condition.questionId];
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;

  const matches = Array.isArray(value)
    ? value.includes(condition.value)
    : String(value) === condition.value;

  switch (condition.op) {
    case 'equals':
    case 'includes':
      return matches;
    case 'not_equals':
      return !matches;
    default:
      return false;
  }
};

export interface VisibilityResult {
  visibleSectionIds: Set<string>;
  visibleQuestionIds: Set<string>;
  /** Respuestas solo de preguntas visibles (las ocultas se descartan). */
  effectiveAnswers: AnswerMap;
}

/**
 * Recorre el formulario en orden. Las condiciones solo pueden apuntar a
 * preguntas anteriores (lo garantiza validateFormStructure), así que una sola
 * pasada basta y no hay ciclos posibles: si el origen está oculto, su
 * respuesta no cuenta y la condición dependiente tampoco se cumple.
 */
export const resolveVisibility = (
  form: Pick<FormDefinition, 'sections'>,
  answers: AnswerMap
): VisibilityResult => {
  const visibleSectionIds = new Set<string>();
  const visibleQuestionIds = new Set<string>();
  const effectiveAnswers: AnswerMap = {};

  for (const section of form.sections) {
    if (section.showIf && !evaluateCondition(section.showIf, effectiveAnswers)) {
      continue;
    }
    visibleSectionIds.add(section.id);

    for (const question of section.questions) {
      if (question.showIf && !evaluateCondition(question.showIf, effectiveAnswers)) {
        continue;
      }
      visibleQuestionIds.add(question.id);
      if (answers[question.id] !== undefined) {
        effectiveAnswers[question.id] = answers[question.id];
      }
    }
  }

  return { visibleSectionIds, visibleQuestionIds, effectiveAnswers };
};

export const flattenQuestions = (
  form: Pick<FormDefinition, 'sections'>
): FormQuestion[] => form.sections.flatMap(section => section.questions);
