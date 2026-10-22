import { apiRequest, apiUpload, buildApiUrl, getAuthToken } from './httpClient';
import type {
  AdminForm,
  AnswerMap,
  ContactValues,
  FormListItem,
  FormResponseItem,
  FormStats,
  FormStatus,
  PlacaIdentity,
  PublicFormData,
  SubmitResult,
} from '../types/forms';

/** Error de la API con el detalle por campo que manda el backend. */
export class FormsApiError extends Error {
  status: number;
  details:
    | {
        contact?: Record<string, string>;
        answers?: Record<string, string>;
        problems?: string[];
      }
    | undefined;

  constructor(message: string, status: number, details?: FormsApiError['details']) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const parse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    const message =
      body?.error?.message || body?.message || 'No pudimos completar la acción, intenta de nuevo';
    throw new FormsApiError(message, response.status, body?.error?.details);
  }
  return body?.data as T;
};

const json = (method: string, body?: unknown): RequestInit =>
  body === undefined ? { method } : { method, body: JSON.stringify(body) };

// ─── Público (/f/:slug) ──────────────────────────────────────────────────────
// apiRequest envía el token si existe: así el backend autollena los datos.

const publicPath = (slug: string) => `forms/public/${encodeURIComponent(slug)}`;

export const fetchPublicForm = async (slug: string) =>
  parse<PublicFormData>(await apiRequest(publicPath(slug)));

/** Sin token a propósito: identificarse por placa es el camino sin sesión. */
export const identifyWithPlaca = async (slug: string, placa: string) =>
  parse<PlacaIdentity>(
    await fetch(buildApiUrl(`${publicPath(slug)}/identify`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placa }),
    })
  );

export interface SubmitFormPayload {
  placa?: string;
  contact: ContactValues;
  answers: AnswerMap;
  acceptPolicy?: boolean;
  saveToProfile?: boolean;
}

export const submitFormResponse = async (slug: string, payload: SubmitFormPayload) =>
  parse<SubmitResult>(await apiRequest(`${publicPath(slug)}/responses`, json('POST', payload)));

// ─── Administración ──────────────────────────────────────────────────────────

export const listForms = async () => parse<FormListItem[]>(await apiRequest('forms'));

export const getForm = async (id: string) => parse<AdminForm>(await apiRequest(`forms/${id}`));

export const createForm = async (title: string, template: 'event' | 'blank' = 'event') =>
  parse<AdminForm>(await apiRequest('forms', json('POST', { title, template })));

export type FormPatch = Partial<
  Pick<
    AdminForm,
    | 'title'
    | 'description'
    | 'coverImage'
    | 'event'
    | 'closesAt'
    | 'capacity'
    | 'contactFields'
    | 'sections'
    | 'attendanceQuestionId'
    | 'settings'
  >
>;

export const updateForm = async (id: string, patch: FormPatch) =>
  parse<AdminForm>(await apiRequest(`forms/${id}`, json('PATCH', patch)));

export const setFormStatus = async (id: string, status: FormStatus) =>
  parse<AdminForm>(await apiRequest(`forms/${id}/status`, json('POST', { status })));

export const duplicateForm = async (id: string) =>
  parse<AdminForm>(await apiRequest(`forms/${id}/duplicate`, json('POST', {})));

export const deleteForm = async (id: string) =>
  parse<null>(await apiRequest(`forms/${id}`, { method: 'DELETE' }));

export const uploadFormCover = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return parse<{ url: string }>(await apiUpload('forms/cover-image', formData));
};

export interface ResponseFilters {
  page?: number;
  limit?: number;
  search?: string;
  attending?: 'yes' | 'no' | 'unknown';
  kind?: 'session' | 'placa' | 'guest';
}

export const listFormResponses = async (id: string, filters: ResponseFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  return parse<{
    items: FormResponseItem[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>(await apiRequest(`forms/${id}/responses?${params.toString()}`));
};

export const getFormStats = async (id: string) => parse<FormStats>(await apiRequest(`forms/${id}/stats`));

export const deleteFormResponse = async (id: string, responseId: string) =>
  parse<null>(await apiRequest(`forms/${id}/responses/${responseId}`, { method: 'DELETE' }));

/** Descarga el Excel (blob) y dispara la descarga en el navegador. */
export const downloadFormResponsesXlsx = async (id: string, filename: string) => {
  const token = getAuthToken();
  const response = await fetch(buildApiUrl(`forms/${id}/export`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) await parse(response);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// ─── Google Sheets ───────────────────────────────────────────────────────────

export const getSheetsConfig = async () =>
  parse<{ configured: boolean; serviceAccountEmail: string | null }>(await apiRequest('forms/sheets/config'));

export const connectSheets = async (id: string, spreadsheet: string) =>
  parse<{ spreadsheetId: string; title: string; rows: number }>(
    await apiRequest(`forms/${id}/sheets`, json('PUT', { spreadsheet }))
  );

export const disconnectSheets = async (id: string) =>
  parse<AdminForm>(await apiRequest(`forms/${id}/sheets`, { method: 'DELETE' }));

export const resyncSheets = async (id: string) =>
  parse<{ rows: number }>(await apiRequest(`forms/${id}/sheets/resync`, json('POST', {})));
