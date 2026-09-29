import {
  calculateAgeFromBirthday,
  ageMatchesRange,
  createYoungSchema,
  updateYoungSchema,
  partialRegistrationSchema,
} from './validation';

const FIXED_NOW = new Date('2026-09-29T12:00:00Z');

beforeAll(() => {
  jest.useFakeTimers().setSystemTime(FIXED_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('calculateAgeFromBirthday', () => {
  it('calcula la edad exacta respetando si ya pasó el cumpleaños este año', () => {
    expect(calculateAgeFromBirthday(new Date('2006-01-15'))).toBe(20); // ya cumplió
    expect(calculateAgeFromBirthday(new Date('2006-12-15'))).toBe(19); // aún no cumple
  });

  it('un bebé de este año da edad 0', () => {
    expect(calculateAgeFromBirthday(new Date('2026-01-01'))).toBe(0);
  });
});

describe('ageMatchesRange', () => {
  it.each([
    ['13-15', 13, true],
    ['13-15', 15, true],
    ['13-15', 16, false],
    ['16-18', 16, true],
    ['16-18', 18, true],
    ['19-21', 21, true],
    ['22-25', 22, true],
    ['26-30', 30, true],
    ['30+', 30, true],
    ['30+', 90, true],
    ['30+', 29, false],
  ] as const)('rango %s con edad %i -> %s', (range, age, expected) => {
    expect(ageMatchesRange(age, range)).toBe(expected);
  });
});

describe('createYoungSchema — consistencia birthday/ageRange', () => {
  const base = {
    fullName: 'Adriana Delgado',
    role: 'colaborador',
  };

  it('rechaza una fecha de nacimiento que no corresponde al rango seleccionado (bug real: typo de año)', () => {
    const { error } = createYoungSchema.validate({
      ...base,
      ageRange: '19-21',
      // Digitado por error como el año en curso en vez del año de nacimiento real.
      birthday: '2025-01-01',
    });
    expect(error).toBeDefined();
    expect(error?.details[0].message).toMatch(
      /no coincide con el rango de edad seleccionado/
    );
  });

  it('acepta una fecha de nacimiento consistente con el rango seleccionado', () => {
    const { error } = createYoungSchema.validate({
      ...base,
      ageRange: '19-21',
      birthday: '2006-05-10', // 20 años a la fecha fija de "ahora"
    });
    expect(error).toBeUndefined();
  });

  it('acepta el borde superior del rango "30+"', () => {
    const { error } = createYoungSchema.validate({
      ...base,
      ageRange: '30+',
      birthday: '1990-01-01',
    });
    expect(error).toBeUndefined();
  });
});

describe('updateYoungSchema — consistencia birthday/ageRange', () => {
  it('rechaza si se actualizan ambos campos y quedan inconsistentes', () => {
    const { error } = updateYoungSchema.validate({
      ageRange: '13-15',
      birthday: '1995-01-01', // adulto, no puede estar en 13-15
    });
    expect(error).toBeDefined();
    expect(error?.details[0].message).toMatch(
      /no coincide con el rango de edad seleccionado/
    );
  });

  it('no exige el cruce cuando solo se actualiza uno de los dos campos', () => {
    const { error } = updateYoungSchema.validate({ birthday: '1995-01-01' });
    expect(error).toBeUndefined();
  });
});

describe('partialRegistrationSchema — consistencia birthday/ageRange', () => {
  const base = {
    fullName: 'Juan Perez',
    role: 'colaborador',
    email: 'juan@example.com',
    password: 'Password123',
    passwordConfirmation: 'Password123',
    acceptPrivacyPolicy: true,
    policyVersion: '1.0',
  };

  it('rechaza fecha de nacimiento inconsistente con el rango de edad enviado', () => {
    const { error } = partialRegistrationSchema.validate({
      ...base,
      ageRange: '13-15',
      birthday: '1995-01-01',
    });
    expect(error).toBeDefined();
    expect(error?.details[0].message).toMatch(
      /no coincide con el rango de edad seleccionado/
    );
  });
});
