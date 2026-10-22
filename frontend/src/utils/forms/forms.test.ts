import { describe, expect, it } from 'vitest';
import { evaluateCondition, resolveVisibility, validateSection } from './conditions';
import {
  buildGoogleCalendarUrl,
  buildMapsUrl,
  formatCost,
  formatEventDate,
  formatEventTime,
  fromBogotaInput,
  toBogotaInput,
} from './eventFormat';
import { buildFormShareUrl, formShareMessage } from '../shareUrls';
import type { FormSection } from '../../types/forms';

// Mismo formulario de ejemplo que backend/src/services/forms/domain/__fixtures__/bowlingForm.ts
const sections: FormSection[] = [
  {
    id: 's1',
    questions: [
      { id: 'attend', type: 'yes_no', label: '¿Asistirás?', required: true },
      {
        id: 'companions',
        type: 'number',
        label: 'Acompañantes',
        required: true,
        validation: { min: 0, max: 5 },
        showIf: { questionId: 'attend', op: 'equals', value: 'yes' },
      },
    ],
  },
  {
    id: 's2',
    showIf: { questionId: 'attend', op: 'equals', value: 'yes' },
    questions: [
      {
        id: 'transport',
        type: 'single_choice',
        label: '¿Cómo llegas?',
        required: true,
        options: [
          { id: 'bus', label: 'Bus' },
          { id: 'own', label: 'Por mi cuenta' },
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
];

describe('condiciones (espejo del backend)', () => {
  it('not_equals es falso sin respuesta', () => {
    expect(evaluateCondition({ questionId: 'a', op: 'not_equals', value: 'yes' }, {})).toBe(false);
    expect(evaluateCondition({ questionId: 'a', op: 'not_equals', value: 'yes' }, { a: 'no' })).toBe(true);
  });

  it('includes con selección múltiple', () => {
    expect(evaluateCondition({ questionId: 'a', op: 'includes', value: 'x' }, { a: ['y', 'x'] })).toBe(true);
  });

  it('sin respuestas solo se ve la primera pregunta', () => {
    const v = resolveVisibility(sections, {});
    expect(v.sections.map(s => s.id)).toEqual(['s1']);
    expect([...v.questionIds]).toEqual(['attend']);
  });

  it('las condiciones encadenadas se apagan si el origen queda oculto', () => {
    const v = resolveVisibility(sections, { attend: 'no', transport: 'bus', pickup: 'Portal' });
    expect(v.questionIds.has('pickup')).toBe(false);
    expect(v.effectiveAnswers).toEqual({ attend: 'no' });
  });

  it('valida obligatorias visibles y rangos numéricos', () => {
    const [s1] = resolveVisibility(sections, { attend: 'yes', companions: 9 }).sections;
    expect(validateSection(s1, { attend: 'yes', companions: 9 })).toEqual({ companions: 'Máximo 5' });
  });
});

describe('formato del evento', () => {
  const iso = '2026-10-25T00:00:00.000Z'; // sábado 24 a las 7 p. m. en Bogotá

  it('fecha y hora en zona de Bogotá', () => {
    expect(formatEventDate(iso)).toBe('Sábado 24 de octubre');
    expect(formatEventTime(iso)).toMatch(/^7:00\s?p/);
  });

  it('costo en pesos o gratis', () => {
    expect(formatCost(25000)).toMatch(/\$\s?25\.000/);
    expect(formatCost(0)).toBe('Gratis');
    expect(formatCost(null)).toBeNull();
  });

  it('Google Calendar usa 3 horas por defecto', () => {
    const url = buildGoogleCalendarUrl('Bolos', { startsAt: iso, location: 'Bolera' }, 'https://x/f/a')!;
    const params = new URL(url).searchParams;
    expect(params.get('dates')).toBe('20261025T000000Z/20261025T030000Z');
    expect(params.get('location')).toBe('Bolera');
    expect(buildGoogleCalendarUrl('Bolos', {})).toBeNull();
  });

  it('datetime-local en hora de Bogotá ida y vuelta', () => {
    expect(toBogotaInput(iso)).toBe('2026-10-24T19:00');
    expect(fromBogotaInput('2026-10-24T19:00')).toBe(iso);
    expect(toBogotaInput(null)).toBe('');
    expect(fromBogotaInput('')).toBeNull();
  });

  it('Maps: enlace propio o búsqueda por lugar', () => {
    expect(buildMapsUrl({ mapsUrl: 'https://maps.app/x' })).toBe('https://maps.app/x');
    expect(buildMapsUrl({ location: 'Bolera 80' })).toContain('query=Bolera%2080');
    expect(buildMapsUrl({})).toBeNull();
  });
});

describe('compartir formulario', () => {
  it('enlace /f/<slug> y mensaje con la fecha', () => {
    expect(buildFormShareUrl('bolos-abc123')).toBe('https://www.jovenesmodelia.com/f/bolos-abc123');
    const message = formShareMessage('URL', 'Salida a bolos', 'Sábado 24 de octubre');
    expect(message).toContain('*Salida a bolos*');
    expect(message).toContain('Sábado 24 de octubre');
    expect(message).toMatch(/URL$/);
  });
});
