import { CHOICE_TYPES, FormCondition, FormDefinition, FormQuestion } from './types';

/**
 * Reglas que debe cumplir un formulario para poder publicarse. Un borrador
 * puede estar incompleto; al publicar se exige que todo sea coherente.
 * Devuelve la lista de problemas en lenguaje sencillo (vacía = OK).
 */
export const validateFormStructure = (form: FormDefinition): string[] => {
  const problems: string[] = [];
  const seenQuestions = new Map<string, FormQuestion>();
  const seenSections = new Set<string>();
  let position = 0;

  const checkCondition = (condition: FormCondition, where: string) => {
    const source = seenQuestions.get(condition.questionId);
    if (!source) {
      problems.push(`${where}: la condición debe depender de una pregunta anterior`);
      return;
    }
    if (!CHOICE_TYPES.includes(source.type)) {
      problems.push(`${where}: solo se puede condicionar a preguntas de opción o sí/no`);
      return;
    }
    const valid =
      source.type === 'yes_no' ? ['yes', 'no'] : (source.options || []).map(o => o.id);
    if (!valid.includes(condition.value)) {
      problems.push(`${where}: la condición usa una opción que ya no existe`);
    }
  };

  if (form.sections.length === 0) problems.push('El formulario necesita al menos una sección');

  form.sections.forEach((section, sIndex) => {
    if (seenSections.has(section.id)) problems.push(`Sección ${sIndex + 1}: id repetido`);
    seenSections.add(section.id);
    if (section.showIf) checkCondition(section.showIf, `Sección ${sIndex + 1}`);

    section.questions.forEach(question => {
      position += 1;
      const where = `Pregunta ${position}${question.label ? ` ("${question.label}")` : ''}`;

      if (seenQuestions.has(question.id)) problems.push(`${where}: id repetido`);
      if (!question.label?.trim()) problems.push(`Pregunta ${position}: falta el enunciado`);

      if (['single_choice', 'multi_choice', 'dropdown'].includes(question.type)) {
        const options = question.options || [];
        if (options.length < 2) problems.push(`${where}: necesita al menos 2 opciones`);
        if (options.some(o => !o.label?.trim())) problems.push(`${where}: hay opciones vacías`);
        if (new Set(options.map(o => o.id)).size !== options.length) {
          problems.push(`${where}: opciones con id repetido`);
        }
      }

      // La condición se valida ANTES de registrar la pregunta: no puede depender de sí misma
      if (question.showIf) checkCondition(question.showIf, where);
      seenQuestions.set(question.id, question);
    });
  });

  if (position === 0) problems.push('El formulario necesita al menos una pregunta');

  if (form.attendanceQuestionId) {
    const attendance = seenQuestions.get(form.attendanceQuestionId);
    if (!attendance || attendance.type !== 'yes_no') {
      problems.push('La pregunta de asistencia debe ser una pregunta Sí/No del formulario');
    }
  }

  if (!form.contactFields.some(c => c.field === 'fullName' && c.mode === 'required')) {
    problems.push('El nombre completo debe ser obligatorio en "Tus datos"');
  }

  return problems;
};
