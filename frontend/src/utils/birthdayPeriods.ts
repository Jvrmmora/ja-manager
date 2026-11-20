/**
 * Períodos de la vista de cumpleaños: un mes o un semestre (S1 enero-junio,
 * S2 julio-diciembre, la misma regla del reporte por semestre). Son funciones
 * puras para poder probarlas sin DOM ni red.
 */

export type Semester = 1 | 2;

export type BirthdayPeriod =
  | { kind: 'month'; month: number } // 0-11
  | { kind: 'semester'; semester: Semester };

export interface BirthdayParts {
  /** 0-11, como Date#getMonth */
  month: number;
  day: number;
}

export interface BirthdayEntry<T> extends BirthdayParts {
  young: T;
}

const DAY_MS = 86_400_000;

export const monthsOfSemester = (semester: Semester): number[] =>
  semester === 1 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];

export const semesterOfMonth = (month: number): Semester => (month < 6 ? 1 : 2);

export const monthsOfPeriod = (period: BirthdayPeriod): number[] =>
  period.kind === 'month' ? [period.month] : monthsOfSemester(period.semester);

/**
 * Mes y día del cumpleaños sin correrse de día por la zona horaria: la API
 * manda 'YYYY-MM-DDT00:00:00.000Z' y aquí solo importa la parte de la fecha.
 */
export const birthdayParts = (
  birthday: Date | string | null | undefined
): BirthdayParts | null => {
  if (!birthday) return null;

  if (typeof birthday === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday.trim());
    if (match) {
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return month >= 0 && month <= 11 && day >= 1 && day <= 31 ? { month, day } : null;
    }
  }

  const date = birthday instanceof Date ? birthday : new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;
  return birthday instanceof Date
    ? { month: date.getUTCMonth(), day: date.getUTCDate() }
    : { month: date.getMonth(), day: date.getDate() };
};

/** El cumpleaños en el año dado (00:00); un 29 de febrero cae el 28 si el año no es bisiesto. */
export const birthdayInYear = ({ month, day }: BirthdayParts, year: number): Date => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
};

/** Días que faltan para el cumpleaños de este año: 0 si es hoy, negativo si ya pasó. */
export const daysUntilBirthday = (parts: BirthdayParts, today: Date): number => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = birthdayInYear(parts, today.getFullYear());
  return Math.round((target.getTime() - start.getTime()) / DAY_MS);
};

/** Cumpleaños del período, ordenados por fecha (mes y día) y luego por nombre. */
export const birthdaysInPeriod = <
  T extends { birthday?: Date | string | null | undefined; fullName: string },
>(
  list: T[],
  period: BirthdayPeriod
): BirthdayEntry<T>[] => {
  const months = monthsOfPeriod(period);
  const entries: BirthdayEntry<T>[] = [];
  for (const young of list) {
    const parts = birthdayParts(young.birthday);
    if (parts && months.includes(parts.month)) entries.push({ young, ...parts });
  }
  return entries.sort(
    (a, b) =>
      a.month - b.month ||
      a.day - b.day ||
      a.young.fullName.localeCompare(b.young.fullName, 'es')
  );
};

/**
 * Por dónde arranca la cinta: el cumpleaños de hoy o el próximo si hoy cae
 * dentro del período; si no (o si ya pasaron todos), el primero.
 */
export const initialSlideIndex = (
  entries: BirthdayParts[],
  period: BirthdayPeriod,
  today: BirthdayParts
): number => {
  if (!monthsOfPeriod(period).includes(today.month)) return 0;
  const index = entries.findIndex(
    e => e.month > today.month || (e.month === today.month && e.day >= today.day)
  );
  return index >= 0 ? index : 0;
};
