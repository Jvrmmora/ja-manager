import crypto from 'crypto';
import { ContactFieldConfig, FormSection } from './types';

export const newId = (): string => crypto.randomUUID();

export interface FormTemplate {
  contactFields: ContactFieldConfig[];
  sections: FormSection[];
  attendanceQuestionId: string | null;
}

export const FORM_TEMPLATES = ['blank', 'event'] as const;
export type FormTemplateName = (typeof FORM_TEMPLATES)[number];

const baseContactFields = (): ContactFieldConfig[] => [
  { field: 'fullName', mode: 'required' },
  { field: 'phone', mode: 'required' },
  { field: 'email', mode: 'optional' },
  { field: 'birthday', mode: 'hidden' },
  { field: 'ageRange', mode: 'hidden' },
  { field: 'gender', mode: 'hidden' },
  { field: 'group', mode: 'hidden' },
];

/**
 * Plantillas iniciales. "event" es el caso principal: confirmar asistencia
 * a una salida (bolos, fogata…) y preguntar por acompañantes solo si va.
 */
export const buildTemplate = (name: FormTemplateName): FormTemplate => {
  if (name === 'blank') {
    return {
      contactFields: baseContactFields(),
      sections: [{ id: newId(), title: '', description: '', showIf: null, questions: [] }],
      attendanceQuestionId: null,
    };
  }

  const attendId = newId();
  return {
    contactFields: baseContactFields(),
    attendanceQuestionId: attendId,
    sections: [
      {
        id: newId(),
        title: '',
        description: '',
        showIf: null,
        questions: [
          { id: attendId, type: 'yes_no', label: '¿Asistirás?', required: true, showIf: null },
          {
            id: newId(),
            type: 'number',
            label: '¿Cuántos acompañantes llevas?',
            help: 'Amigos o familiares que vienen contigo (sin contarte a ti)',
            required: false,
            validation: { min: 0, max: 10 },
            showIf: { questionId: attendId, op: 'equals', value: 'yes' },
          },
          {
            id: newId(),
            type: 'paragraph',
            label: '¿Algo que debamos saber?',
            help: 'Alergias, si llegas tarde, etc.',
            required: false,
            showIf: { questionId: attendId, op: 'equals', value: 'yes' },
          },
        ],
      },
    ],
  };
};
