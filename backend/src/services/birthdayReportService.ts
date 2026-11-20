import mongoose from 'mongoose';
import Young from '../models/Young';
import FormResponse from '../models/FormResponse';
import BirthdayGuest from '../models/BirthdayGuest';
import {
  getBirthdayCalendarParts,
  getCurrentDateTimeColombia,
} from '../utils/dateUtils';

/**
 * Reporte de cumpleaños por semestre (S1: enero-junio, S2: julio-diciembre):
 * jóvenes del grupo 1 + invitados del formulario elegido + invitados manuales.
 * La lógica de armado y el CSV son funciones puras para probarlas sin base.
 */

export type Semester = 1 | 2;

export const ORIGIN_GRUPO1 = 'Grupo 1';
export const ORIGIN_FORM_GUEST = 'Invitado formulario';
export const ORIGIN_MANUAL_GUEST = 'Invitado manual';

export interface BirthdayRow {
  name: string;
  /** 0-11 */
  month: number;
  day: number;
  origin: string;
}

export interface BirthdayMonthGroup {
  month: number;
  label: string;
  rows: BirthdayRow[];
}

export interface BirthdayReport {
  semester: Semester;
  groups: BirthdayMonthGroup[];
  total: number;
}

const MONTH_NAMES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

export const monthsOfSemester = (semester: Semester): number[] =>
  semester === 1 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];

/** Sin tildes, en minúsculas y con espacios simples: para comparar y ordenar. */
export const normalizeName = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Clave de orden alfabético por primer nombre: ignora tildes y el "Pr." de pastor. */
export const sortKey = (name: string): string => normalizeName(name).replace(/^pr\.?\s+/, '');

/** 'YYYY-MM-DD' → { month (0-11), day } o null si no es una fecha válida. */
export const parseBirthdayString = (value: unknown): { month: number; day: number } | null => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { month, day };
};

/**
 * Agrupa por mes del semestre, ordena A-Z por primer nombre y quita repetidos.
 * Si un mismo nombre llega de varias fuentes se queda la primera de `rows`
 * (el grupo 1 va primero: es la fuente más confiable).
 */
export const buildReport = (rows: BirthdayRow[], semester: Semester): BirthdayReport => {
  const seen = new Set<string>();
  const groups: BirthdayMonthGroup[] = monthsOfSemester(semester).map(month => ({
    month,
    label: MONTH_NAMES[month],
    rows: [],
  }));

  // Un invitado que ya es del grupo 1 pero escribió su nombre distinto
  // ("Luz H Zapata C" vs "Luz Helena Zapata") se detecta por día, mes y primer nombre.
  const firstName = (name: string) => sortKey(name).split(' ')[0];
  const youngKeys = new Set(
    rows
      .filter(r => r.origin === ORIGIN_GRUPO1)
      .map(r => `${r.month}-${r.day}-${firstName(r.name)}`)
  );

  for (const row of rows) {
    const group = groups.find(g => g.month === row.month);
    if (!group) continue;
    const key = normalizeName(row.name);
    if (!key || seen.has(key)) continue;
    if (
      row.origin !== ORIGIN_GRUPO1 &&
      youngKeys.has(`${row.month}-${row.day}-${firstName(row.name)}`)
    ) {
      continue;
    }
    seen.add(key);
    group.rows.push(row);
  }

  for (const group of groups) {
    group.rows.sort(
      (a, b) => sortKey(a.name).localeCompare(sortKey(b.name), 'es') || a.day - b.day
    );
  }

  return { semester, groups, total: groups.reduce((sum, g) => sum + g.rows.length, 0) };
};

const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const pad = (n: number) => String(n).padStart(2, '0');

/** CSV agrupado por mes, con BOM para que Excel respete las tildes. */
export const reportToCsv = (report: BirthdayReport): string => {
  const lines = ['Mes,Nombre completo,Cumpleaños (día/mes),Origen'];
  for (const group of report.groups) {
    lines.push(`${csvCell(`${group.label} (${group.rows.length})`)},,,`);
    for (const row of group.rows) {
      lines.push(
        [
          '',
          csvCell(row.name),
          `${pad(row.day)}/${pad(row.month + 1)}`,
          csvCell(row.origin),
        ].join(',')
      );
    }
  }
  lines.push(`${csvCell(`Total registrados: ${report.total}`)},,,`);
  return `\uFEFF${lines.join('\n')}\n`;
};

/** Semestre que corresponde a la fecha dada (por defecto, hoy). */
export const currentSemester = (now: Date = getCurrentDateTimeColombia()): Semester =>
  now.getMonth() < 6 ? 1 : 2;

// ─── Carga de datos ──────────────────────────────────────────────────────────

const isObjectId = (value: unknown): value is string =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

export const loadBirthdayRows = async (formId?: string | null): Promise<BirthdayRow[]> => {
  const rows: BirthdayRow[] = [];

  // Grupo 1: mismas exclusiones que el ranking y los puntos de cumpleaños.
  const youngs = await Young.find({
    group: 1,
    deletedAt: null,
    isSpam: { $ne: true },
    role_name: { $ne: 'Super Admin' },
    birthday: { $exists: true, $ne: null },
  })
    .select('fullName birthday')
    .lean();

  for (const young of youngs) {
    const { month, day } = getBirthdayCalendarParts(young.birthday as Date);
    rows.push({ name: young.fullName, month, day, origin: ORIGIN_GRUPO1 });
  }

  // Invitados del formulario (quienes no confirmaron asistencia quedan fuera).
  if (isObjectId(formId)) {
    const responses = await FormResponse.find({
      formId,
      'respondent.kind': 'guest',
      attending: { $ne: false },
    })
      .select('respondent.contact')
      .lean();

    for (const response of responses) {
      const contact = (response.respondent?.contact ?? {}) as {
        fullName?: string;
        birthday?: string;
      };
      const parsed = parseBirthdayString(contact.birthday);
      if (!contact.fullName || !parsed) continue;
      rows.push({
        name: contact.fullName.trim(),
        month: parsed.month,
        day: parsed.day,
        origin: ORIGIN_FORM_GUEST,
      });
    }
  }

  // Invitados manuales: los de este formulario y los generales (sin formulario).
  const manual = await BirthdayGuest.find({
    $or: [{ formId: null }, ...(isObjectId(formId) ? [{ formId }] : [])],
  }).lean();
  for (const guest of manual) {
    rows.push({
      name: guest.fullName,
      month: guest.month - 1,
      day: guest.day,
      origin: ORIGIN_MANUAL_GUEST,
    });
  }

  return rows;
};

export const generateBirthdayReport = async (
  semester: Semester,
  formId?: string | null
): Promise<BirthdayReport> => buildReport(await loadBirthdayRows(formId), semester);
