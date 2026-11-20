import { describe, expect, it } from 'vitest';
import {
  birthdayInYear,
  birthdayParts,
  birthdaysInPeriod,
  daysUntilBirthday,
  initialSlideIndex,
  monthsOfPeriod,
  monthsOfSemester,
  semesterOfMonth,
  type BirthdayPeriod,
} from './birthdayPeriods';

const young = (fullName: string, birthday: string | null) => ({ fullName, birthday });

describe('semestres', () => {
  it('el 1 va de enero a junio y el 2 de julio a diciembre', () => {
    expect(monthsOfSemester(1)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(monthsOfSemester(2)).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it('ubica cada mes en su semestre', () => {
    expect(semesterOfMonth(0)).toBe(1);
    expect(semesterOfMonth(5)).toBe(1);
    expect(semesterOfMonth(6)).toBe(2);
    expect(semesterOfMonth(11)).toBe(2);
  });

  it('un período de mes es solo ese mes', () => {
    expect(monthsOfPeriod({ kind: 'month', month: 10 })).toEqual([10]);
  });
});

describe('birthdayParts', () => {
  it('lee YYYY-MM-DD sin correrse de día', () => {
    expect(birthdayParts('1999-11-20')).toEqual({ month: 10, day: 20 });
  });

  it('lee el ISO completo que manda la API (medianoche UTC)', () => {
    expect(birthdayParts('2001-01-01T00:00:00.000Z')).toEqual({ month: 0, day: 1 });
    expect(birthdayParts(new Date('2001-01-01T00:00:00.000Z'))).toEqual({ month: 0, day: 1 });
  });

  it('descarta fechas vacías o inválidas', () => {
    expect(birthdayParts(null)).toBeNull();
    expect(birthdayParts('')).toBeNull();
    expect(birthdayParts('no es fecha')).toBeNull();
    expect(birthdayParts('2001-13-40')).toBeNull();
  });
});

describe('birthdaysInPeriod', () => {
  const list = [
    young('Zoe', '2000-12-01'),
    young('Bruno', '1999-07-15'),
    young('Ana', '2001-07-15'),
    young('Carla', '2002-03-02'),
    young('Sin fecha', null),
  ];
  const names = (period: BirthdayPeriod) =>
    birthdaysInPeriod(list, period).map(e => e.young.fullName);

  it('filtra por mes', () => {
    expect(names({ kind: 'month', month: 6 })).toEqual(['Ana', 'Bruno']);
  });

  it('ordena el semestre por fecha y, el mismo día, por nombre', () => {
    expect(names({ kind: 'semester', semester: 2 })).toEqual(['Ana', 'Bruno', 'Zoe']);
  });

  it('el primer semestre no trae meses del segundo', () => {
    expect(names({ kind: 'semester', semester: 1 })).toEqual(['Carla']);
  });
});

describe('initialSlideIndex', () => {
  const entries = [
    { month: 6, day: 3 },
    { month: 10, day: 6 },
    { month: 10, day: 20 },
    { month: 11, day: 8 },
  ];
  const s2: BirthdayPeriod = { kind: 'semester', semester: 2 };

  it('arranca en el cumpleaños de hoy', () => {
    expect(initialSlideIndex(entries, s2, { month: 10, day: 20 })).toBe(2);
  });

  it('si hoy nadie cumple, arranca en el próximo', () => {
    expect(initialSlideIndex(entries, s2, { month: 10, day: 10 })).toBe(2);
  });

  it('si hoy no cae en el período o ya pasaron todos, arranca en el primero', () => {
    expect(initialSlideIndex(entries, { kind: 'semester', semester: 1 }, { month: 10, day: 20 })).toBe(0);
    expect(initialSlideIndex(entries, s2, { month: 11, day: 30 })).toBe(0);
  });
});

describe('daysUntilBirthday', () => {
  const today = new Date(2026, 10, 20, 15, 30);

  it('0 si es hoy, positivo si falta y negativo si ya pasó', () => {
    expect(daysUntilBirthday({ month: 10, day: 20 }, today)).toBe(0);
    expect(daysUntilBirthday({ month: 10, day: 25 }, today)).toBe(5);
    expect(daysUntilBirthday({ month: 10, day: 6 }, today)).toBe(-14);
  });

  it('el 29 de febrero cae el 28 si el año no es bisiesto', () => {
    expect(birthdayInYear({ month: 1, day: 29 }, 2026).getDate()).toBe(28);
    expect(birthdayInYear({ month: 1, day: 29 }, 2028).getDate()).toBe(29);
  });
});
