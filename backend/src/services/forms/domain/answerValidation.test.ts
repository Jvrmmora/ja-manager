import { validateAnswers } from './answerValidation';
import { bowlingForm } from './__fixtures__/bowlingForm';

describe('validateAnswers', () => {
  it('acepta una respuesta completa de quien asiste', () => {
    const { answers, errors } = validateAnswers(bowlingForm(), {
      attend: 'yes',
      companions: '2',
      transport: 'bus',
      snacks: ['pizza', 'pizza', 'veg'],
      pickup: '  Portal 80 ',
    });
    expect(errors).toEqual({});
    expect(answers).toEqual({
      attend: 'yes',
      companions: 2,
      transport: 'bus',
      snacks: ['pizza', 'veg'],
      pickup: 'Portal 80',
    });
  });

  it('no exige obligatorias que quedaron ocultas', () => {
    const { errors, answers } = validateAnswers(bowlingForm(), { attend: 'no' });
    expect(errors).toEqual({});
    expect(answers).toEqual({ attend: 'no' });
  });

  it('exige las obligatorias visibles', () => {
    const { errors } = validateAnswers(bowlingForm(), { attend: 'yes' });
    expect(Object.keys(errors).sort()).toEqual(['companions', 'transport']);
  });

  it('descarta respuestas a preguntas ocultas o inexistentes', () => {
    const { answers } = validateAnswers(bowlingForm(), {
      attend: 'no',
      companions: 3,
      hacker: 'x',
    });
    expect(answers).toEqual({ attend: 'no' });
  });

  it('rechaza opciones que no existen y números fuera de rango', () => {
    const { errors } = validateAnswers(bowlingForm(), {
      attend: 'yes',
      companions: 9,
      transport: 'helicopter',
    });
    expect(errors.companions).toMatch(/Máximo 5/);
    expect(errors.transport).toBe('Opción no válida');
  });

  it('rechaza un sí/no inválido y no evalúa condiciones con él', () => {
    const { errors, answers } = validateAnswers(bowlingForm(), { attend: 'maybe' });
    expect(errors).toEqual({ attend: 'Opción no válida' });
    expect(answers).toEqual({});
  });

  it('valida fechas y longitud de texto', () => {
    const form = {
      sections: [
        {
          id: 's',
          questions: [
            { id: 'd', type: 'date' as const, label: 'Fecha', required: true },
            { id: 't', type: 'short_text' as const, label: 'T', required: false, validation: { maxLength: 3 } },
          ],
        },
      ],
    };
    expect(validateAnswers(form, { d: '2026-13-45', t: 'abcd' }).errors).toEqual({
      d: 'Fecha no válida',
      t: 'Máximo 3 caracteres',
    });
    expect(validateAnswers(form, { d: '2026-10-25', t: 'abc' }).errors).toEqual({});
  });
});

describe('validateAnswers según quién responde', () => {
  const formWithReferral = (required: boolean) => {
    const form = bowlingForm();
    form.sections[0].questions.push({
      id: 'referral',
      type: 'short_text',
      label: '¿Quién te invitó o cómo te enteraste?',
      required,
      audience: 'guests',
    });
    return form;
  };

  it('al invitado se le exige la pregunta obligatoria solo para invitados', () => {
    const { errors } = validateAnswers(formWithReferral(true), { attend: 'no' }, 'guest');
    expect(errors).toEqual({ referral: 'Esta pregunta es obligatoria' });
  });

  it('al joven registrado no se le exige ni se le guarda', () => {
    const { answers, errors } = validateAnswers(
      formWithReferral(true),
      { attend: 'no', referral: 'intento colarla' },
      'member'
    );
    expect(errors).toEqual({});
    expect(answers).toEqual({ attend: 'no' });
  });

  it('sin viewer no se filtra por audiencia', () => {
    const { answers } = validateAnswers(formWithReferral(false), { attend: 'no', referral: 'Juan' });
    expect(answers.referral).toBe('Juan');
  });
});

