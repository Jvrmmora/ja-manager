import { FormDefinition } from '../types';

/** Formulario de ejemplo "Salida a bolos" usado por las pruebas del dominio. */
export const bowlingForm = (): FormDefinition => ({
  contactFields: [
    { field: 'fullName', mode: 'required' },
    { field: 'phone', mode: 'required' },
    { field: 'email', mode: 'optional' },
    { field: 'group', mode: 'hidden' },
  ],
  attendanceQuestionId: 'attend',
  sections: [
    {
      id: 's1',
      title: 'Asistencia',
      questions: [
        { id: 'attend', type: 'yes_no', label: '¿Asistirás?', required: true },
        {
          id: 'companions',
          type: 'number',
          label: '¿Cuántos acompañantes llevas?',
          required: true,
          validation: { min: 0, max: 5 },
          showIf: { questionId: 'attend', op: 'equals', value: 'yes' },
        },
        {
          id: 'why',
          type: 'paragraph',
          label: '¿Por qué no puedes ir?',
          required: false,
          showIf: { questionId: 'attend', op: 'equals', value: 'no' },
        },
      ],
    },
    {
      id: 's2',
      title: 'Transporte',
      showIf: { questionId: 'attend', op: 'equals', value: 'yes' },
      questions: [
        {
          id: 'transport',
          type: 'single_choice',
          label: '¿Cómo llegas?',
          required: true,
          options: [
            { id: 'bus', label: 'Bus de la iglesia' },
            { id: 'own', label: 'Por mi cuenta' },
          ],
        },
        {
          id: 'snacks',
          type: 'multi_choice',
          label: '¿Qué quieres comer?',
          required: false,
          options: [
            { id: 'pizza', label: 'Pizza' },
            { id: 'hotdog', label: 'Perro caliente' },
            { id: 'veg', label: 'Vegetariano' },
          ],
        },
        {
          id: 'pickup',
          type: 'short_text',
          label: '¿Dónde te recogemos?',
          required: true,
          showIf: { questionId: 'transport', op: 'equals', value: 'bus' },
        },
      ],
    },
  ],
});
