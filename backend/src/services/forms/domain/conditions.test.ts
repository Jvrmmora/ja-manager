import { evaluateCondition, isVisibleToViewer, resolveVisibility } from './conditions';
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

describe('audiencia (quién responde)', () => {
  const withReferral = () => {
    const form = bowlingForm();
    form.sections[0].questions.push({
      id: 'referral',
      type: 'short_text',
      label: '¿Quién te invitó o cómo te enteraste?',
      required: false,
      audience: 'guests',
    });
    return form;
  };

  it('isVisibleToViewer: sin audiencia o "all" ven todos; sin viewer no se filtra', () => {
    expect(isVisibleToViewer(undefined, 'guest')).toBe(true);
    expect(isVisibleToViewer('all', 'member')).toBe(true);
    expect(isVisibleToViewer('guests', undefined)).toBe(true);
    expect(isVisibleToViewer('guests', 'guest')).toBe(true);
    expect(isVisibleToViewer('guests', 'member')).toBe(false);
    expect(isVisibleToViewer('members', 'member')).toBe(true);
    expect(isVisibleToViewer('members', 'guest')).toBe(false);
  });

  it('una pregunta solo para invitados no la ve un joven registrado', () => {
    const answers = { attend: 'yes', referral: 'Me invitó Juan' };
    const guest = resolveVisibility(withReferral(), answers, 'guest');
    const member = resolveVisibility(withReferral(), answers, 'member');
    expect(guest.visibleQuestionIds.has('referral')).toBe(true);
    expect(guest.effectiveAnswers.referral).toBe('Me invitó Juan');
    expect(member.visibleQuestionIds.has('referral')).toBe(false);
    expect(member.effectiveAnswers.referral).toBeUndefined();
  });

  it('se combina con showIf: el invitado que no asiste tampoco la ve', () => {
    const form = withReferral();
    form.sections[0].questions[form.sections[0].questions.length - 1].showIf = {
      questionId: 'attend',
      op: 'equals',
      value: 'yes',
    };
    expect(resolveVisibility(form, { attend: 'no' }, 'guest').visibleQuestionIds.has('referral')).toBe(false);
    expect(resolveVisibility(form, { attend: 'yes' }, 'guest').visibleQuestionIds.has('referral')).toBe(true);
    expect(resolveVisibility(form, { attend: 'yes' }, 'member').visibleQuestionIds.has('referral')).toBe(false);
  });
});

