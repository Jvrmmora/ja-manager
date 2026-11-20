import { apiRequest } from './httpClient';

export type Semester = 1 | 2;

export interface BirthdayRow {
  name: string;
  /** 0-11 */
  month: number;
  day: number;
  origin: string;
  /** Solo jóvenes registrados: placa y foto de la base de datos. */
  placa?: string;
  profileImage?: string;
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

export interface BirthdayGuest {
  id: string;
  fullName: string;
  /** 1-12 */
  month: number;
  day: number;
  formId: string | null;
}

const parse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new Error(
      body?.error?.message || body?.message || 'No pudimos completar la acción, intenta de nuevo'
    );
  }
  return body?.data as T;
};

const query = (semester: Semester, formId: string) => {
  const params = new URLSearchParams({ semester: String(semester) });
  if (formId) params.set('formId', formId);
  return params.toString();
};

export const fetchBirthdayReport = async (semester: Semester, formId: string) =>
  parse<BirthdayReport>(await apiRequest(`birthday-report?${query(semester, formId)}`));

/** Descarga el CSV con el token de sesión (un enlace directo no lo enviaría). */
export const downloadBirthdayReportCsv = async (semester: Semester, formId: string) => {
  const response = await apiRequest(`birthday-report/csv?${query(semester, formId)}`);
  if (!response.ok) {
    throw new Error('No se pudo descargar el reporte');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cumpleanos-semestre-${semester}-${new Date().getFullYear()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const listBirthdayGuests = async (formId: string) =>
  parse<BirthdayGuest[]>(
    await apiRequest(`birthday-report/guests${formId ? `?formId=${formId}` : ''}`)
  );

export const addBirthdayGuest = async (input: {
  fullName: string;
  month: number;
  day: number;
  formId: string | null;
}) =>
  parse<BirthdayGuest>(
    await apiRequest('birthday-report/guests', { method: 'POST', body: JSON.stringify(input) })
  );

export const deleteBirthdayGuest = async (id: string) =>
  parse<void>(await apiRequest(`birthday-report/guests/${id}`, { method: 'DELETE' }));
