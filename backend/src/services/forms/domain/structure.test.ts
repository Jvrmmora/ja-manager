import { validateFormStructure } from './structure';
import { bowlingForm } from './__fixtures__/bowlingForm';

describe('validateFormStructure', () => {
  it('el formulario de ejemplo es válido', () => {
    expect(validateFormStructure(bowlingForm())).toEqual([]);
  });

  it('rechaza condiciones hacia adelante o sobre sí misma', () => {
    const form = bowlingForm();
    form.sections[0].questions[0].showIf = { questionId: 'transport', op: 'equals', value: 'bus' };
    form.sections[1].questions[0].showIf = { questionId: 'transport', op: 'equals', value: 'bus' };
    const problems = validateFormStructure(form);
    expect(problems.filter(p => p.includes('pregunta anterior'))).toHaveLength(2);
  });

  it('rechaza condiciones sobre preguntas de texto o con opciones inexistentes', () => {
    const form = bowlingForm();
    form.sections[1].questions[2].showIf = { questionId: 'companions', op: 'equals', value: '2' };
    form.sections[1].questions[1].showIf = { questionId: 'transport', op: 'equals', value: 'walk' };
    const problems = validateFormStructure(form);
    expect(problems.some(p => p.includes('opción o sí/no'))).toBe(true);
    expect(problems.some(p => p.includes('ya no existe'))).toBe(true);
  });

  it('exige opciones, enunciados e ids únicos', () => {
    const form = bowlingForm();
    form.sections[1].questions[0].options = [{ id: 'bus', label: 'Bus' }];
    form.sections[1].questions[1].label = '  ';
    form.sections[1].questions[2].id = 'attend';
    const problems = validateFormStructure(form);
    expect(problems.some(p => p.includes('al menos 2 opciones'))).toBe(true);
    expect(problems.some(p => p.includes('falta el enunciado'))).toBe(true);
    expect(problems.some(p => p.includes('id repetido'))).toBe(true);
  });

  it('la pregunta de asistencia debe ser sí/no y el nombre obligatorio', () => {
    const form = bowlingForm();
    form.attendanceQuestionId = 'transport';
    form.contactFields[0].mode = 'optional';
    const problems = validateFormStructure(form);
    expect(problems.some(p => p.includes('asistencia'))).toBe(true);
    expect(problems.some(p => p.includes('nombre completo'))).toBe(true);
  });

  it('un formulario vacío no se puede publicar', () => {
    const problems = validateFormStructure({ contactFields: [{ field: 'fullName', mode: 'required' }], sections: [] });
    expect(problems).toEqual(
      expect.arrayContaining(['El formulario necesita al menos una sección', 'El formulario necesita al menos una pregunta'])
    );
  });
});
