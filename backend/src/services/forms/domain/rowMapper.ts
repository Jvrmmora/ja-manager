import { flattenQuestions } from './conditions';
import { CONTACT_FIELD_LABELS } from './identity';
import { AnswerValue, ContactSnapshot, FormDefinition, FormQuestion } from './types';

export type RespondentKind = 'session' | 'placa' | 'guest';

export const RESPONDENT_KIND_LABELS: Record<RespondentKind, string> = {
  session: 'Joven (sesión)',
  placa: 'Joven (placa)',
  guest: 'Invitado',
};

const GENDER_LABELS: Record<string, string> = { masculino: 'Masculino', femenino: 'Femenino' };

export interface ResponseRowInput {
  submittedAt: Date;
  kind: RespondentKind;
  placa?: string | null;
  contact: ContactSnapshot;
  answers: Record<string, AnswerValue>;
}

export interface SheetColumn {
  key: string;
  label: string;
}

/**
 * Columnas de la hoja: fijas + datos de contacto visibles + preguntas en el
 * orden del formulario. Excel y Google Sheets usan exactamente las mismas.
 */
export const buildColumns = (form: FormDefinition): SheetColumn[] => [
  { key: '_submittedAt', label: 'Fecha de respuesta' },
  { key: '_kind', label: 'Tipo' },
  { key: '_placa', label: 'Placa' },
  ...form.contactFields
    .filter(c => c.mode !== 'hidden')
    .map(c => ({ key: `contact.${c.field}`, label: CONTACT_FIELD_LABELS[c.field] })),
  ...flattenQuestions(form).map(q => ({ key: `q.${q.id}`, label: q.label })),
];

/** Traduce ids de opción a sus textos legibles. */
export const formatAnswer = (question: FormQuestion, value: AnswerValue | undefined): string => {
  if (value === undefined || value === null) return '';
  if (question.type === 'yes_no') return value === 'yes' ? 'Sí' : value === 'no' ? 'No' : '';
  const labelOf = (id: string) => question.options?.find(o => o.id === id)?.label ?? id;
  if (Array.isArray(value)) return value.map(labelOf).join(', ');
  if (['single_choice', 'dropdown'].includes(question.type)) return labelOf(String(value));
  return String(value);
};

const formatDateTime = (date: Date): string =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

export const buildRow = (
  form: FormDefinition,
  columns: SheetColumn[],
  input: ResponseRowInput
): string[] => {
  const questions = new Map(flattenQuestions(form).map(q => [q.id, q]));

  return columns.map(({ key }) => {
    if (key === '_submittedAt') return formatDateTime(input.submittedAt);
    if (key === '_kind') return RESPONDENT_KIND_LABELS[input.kind];
    if (key === '_placa') return input.placa || '';
    if (key.startsWith('contact.')) {
      const field = key.slice('contact.'.length) as keyof ContactSnapshot;
      const value = input.contact[field];
      if (value === undefined || value === null) return '';
      return field === 'gender' ? GENDER_LABELS[String(value)] ?? String(value) : String(value);
    }
    const question = questions.get(key.slice('q.'.length));
    return question ? formatAnswer(question, input.answers[question.id]) : '';
  });
};
