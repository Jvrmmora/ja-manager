import { describe, expect, it } from 'vitest';
import { builderReducer, conditionSources, type BuilderState } from './builderReducer';

const base = (): BuilderState => ({
  contactFields: [
    { field: 'fullName', mode: 'required' },
    { field: 'phone', mode: 'required' },
  ],
  attendanceQuestionId: 'attend',
  sections: [
    {
      id: 's1',
      questions: [
        { id: 'attend', type: 'yes_no', label: '¿Asistirás?', required: true },
        {
          id: 'transport',
          type: 'single_choice',
          label: 'Transporte',
          required: true,
          options: [
            { id: 'bus', label: 'Bus' },
            { id: 'own', label: 'Propio' },
          ],
          showIf: { questionId: 'attend', op: 'equals', value: 'yes' },
        },
        {
          id: 'pickup',
          type: 'short_text',
          label: 'Recogida',
          required: false,
          showIf: { questionId: 'transport', op: 'equals', value: 'bus' },
        },
      ],
    },
    {
      id: 's2',
      showIf: { questionId: 'attend', op: 'equals', value: 'yes' },
      questions: [],
    },
  ],
});

const question = (state: BuilderState, id: string) =>
  state.sections.flatMap(s => s.questions).find(q => q.id === id)!;

describe('builderReducer', () => {
  it('agregar una pregunta de opción trae 2 opciones por defecto', () => {
    const state = builderReducer(base(), { type: 'addQuestion', sectionId: 's2', questionType: 'multi_choice' });
    const added = state.sections[1].questions[0];
    expect(added.type).toBe('multi_choice');
    expect(added.options).toHaveLength(2);
  });

  it('agrega después de una pregunta específica', () => {
    const state = builderReducer(base(), { type: 'addQuestion', sectionId: 's1', questionType: 'paragraph', afterId: 'attend' });
    expect(state.sections[0].questions.map(q => q.type)).toEqual(['yes_no', 'paragraph', 'single_choice', 'short_text']);
  });

  it('borrar una pregunta limpia las condiciones y la asistencia que dependían de ella', () => {
    const state = builderReducer(base(), { type: 'removeQuestion', questionId: 'attend' });
    expect(question(state, 'transport').showIf).toBeNull();
    expect(state.sections[1].showIf).toBeNull();
    expect(state.attendanceQuestionId).toBeNull();
  });

  it('borrar una opción limpia las condiciones que la usaban', () => {
    const state = builderReducer(base(), { type: 'removeOption', questionId: 'transport', optionId: 'bus' });
    expect(question(state, 'pickup').showIf).toBeNull();
  });

  it('cambiar a texto quita opciones y condiciones dependientes; entre opciones las conserva', () => {
    const toDropdown = builderReducer(base(), { type: 'changeQuestionType', questionId: 'transport', questionType: 'dropdown' });
    expect(question(toDropdown, 'transport').options!.map(o => o.id)).toEqual(['bus', 'own']);
    expect(question(toDropdown, 'pickup').showIf).not.toBeNull();

    const toText = builderReducer(base(), { type: 'changeQuestionType', questionId: 'transport', questionType: 'short_text' });
    expect(question(toText, 'transport').options).toBeUndefined();
    expect(question(toText, 'pickup').showIf).toBeNull();
  });

  it('mover una pregunta por encima de su origen elimina la condición (debe depender de una anterior)', () => {
    const state = builderReducer(base(), { type: 'moveQuestion', questionId: 'transport', direction: -1 });
    expect(state.sections[0].questions.map(q => q.id)).toEqual(['transport', 'attend', 'pickup']);
    expect(question(state, 'transport').showIf).toBeNull();
    expect(question(state, 'pickup').showIf).not.toBeNull();
  });

  it('mover en el borde salta a la sección vecina', () => {
    const state = builderReducer(base(), { type: 'moveQuestion', questionId: 'pickup', direction: 1 });
    expect(state.sections[0].questions.map(q => q.id)).toEqual(['attend', 'transport']);
    expect(state.sections[1].questions.map(q => q.id)).toEqual(['pickup']);
  });

  it('duplicar crea ids nuevos para la pregunta y sus opciones', () => {
    const state = builderReducer(base(), { type: 'duplicateQuestion', questionId: 'transport' });
    const [, original, copy] = state.sections[0].questions;
    expect(copy.id).not.toBe(original.id);
    expect(copy.label).toBe('Transporte (copia)');
    expect(copy.options!.map(o => o.id)).not.toEqual(original.options!.map(o => o.id));
  });

  it('no deja borrar la única sección ni cambiar el nombre a opcional', () => {
    let state = builderReducer(base(), { type: 'removeSection', sectionId: 's2' });
    state = builderReducer(state, { type: 'removeSection', sectionId: 's1' });
    expect(state.sections).toHaveLength(1);
    const same = builderReducer(state, { type: 'setContactMode', field: 'fullName', mode: 'hidden' });
    expect(same).toBe(state);
  });

  it('setContactMode agrega campos nuevos', () => {
    const state = builderReducer(base(), { type: 'setContactMode', field: 'email', mode: 'optional' });
    expect(state.contactFields).toContainEqual({ field: 'email', mode: 'optional' });
  });

  it('conditionSources solo ofrece preguntas de opción anteriores', () => {
    expect(conditionSources(base().sections, 'pickup').map(q => q.id)).toEqual(['attend', 'transport']);
    expect(conditionSources(base().sections, 's2').map(q => q.id)).toEqual(['attend', 'transport']);
  });
});
