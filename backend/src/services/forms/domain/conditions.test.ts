import { evaluateCondition, resolveVisibility } from './conditions';
import { bowlingForm } from './__fixtures__/bowlingForm';

describe('evaluateCondition', () => {
  it('equals compara contra el valor de la respuesta', () => {
    const cond = { questionId: 'a', op: 'equals' as const, value: 'yes' };
    expect(evaluateCondition(cond, { a: 'yes' })).toBe(true);
    expect(evaluateCondition(cond, { a: 'no' })).toBe(false);
  });

  it('includes funciona con selección múltiple', () => {
    const cond = { questionId: 'a', op: 'includes' as const, value: 'pizza' };
    expect(evaluateCondition(cond, { a: ['veg', 'pizza'] })).toBe(true);
    expect(evaluateCondition(cond, { a: ['veg'] })).toBe(false);
  });

  it('not_equals es falso mientras la pregunta no tenga respuesta', () => {
    const cond = { questionId: 'a', op: 'not_equals' as const, value: 'yes' };
    expect(evaluateCondition(cond, {})).toBe(false);
    expect(evaluateCondition(cond, { a: [] })).toBe(false);
    expect(evaluateCondition(cond, { a: 'no' })).toBe(true);
  });
});

describe('resolveVisibility', () => {
  it('sin respuestas solo se ve la primera pregunta', () => {
    const { visibleQuestionIds, visibleSectionIds } = resolveVisibility(bowlingForm(), {});
    expect([...visibleQuestionIds]).toEqual(['attend']);
    expect([...visibleSectionIds]).toEqual(['s1']);
  });

  it('si asiste muestra acompañantes y la sección de transporte', () => {
    const { visibleQuestionIds } = resolveVisibility(bowlingForm(), { attend: 'yes' });
    expect(visibleQuestionIds).toEqual(new Set(['attend', 'companions', 'transport', 'snacks']));
  });

  it('las condiciones encadenadas se apagan si el origen queda oculto', () => {
    // "pickup" depende de "transport", que vive en una sección que depende de "attend"
    const { visibleQuestionIds, effectiveAnswers } = resolveVisibility(bowlingForm(), {
      attend: 'no',
      transport: 'bus',
      pickup: 'Portal 80',
    });
    expect(visibleQuestionIds.has('pickup')).toBe(false);
    expect(effectiveAnswers).toEqual({ attend: 'no' });
  });
});
