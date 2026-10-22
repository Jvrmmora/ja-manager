import { maskEmail, maskPhone, shortName } from './mask';
import { buildColumns, buildRow } from './rowMapper';
import { generateFormSlug, slugify, SLUG_REGEX } from './slug';
import { bowlingForm } from './__fixtures__/bowlingForm';

describe('mask', () => {
  it('shortName deja nombre + inicial del último apellido', () => {
    expect(shortName('Javier Andrés Montaño')).toBe('Javier M.');
    expect(shortName('  Ana ')).toBe('Ana');
    expect(shortName('')).toBe('');
  });

  it('maskPhone muestra solo los últimos 4 dígitos', () => {
    expect(maskPhone('+57 300 123 4567')).toBe('••• 4567');
    expect(maskPhone('12')).toBeNull();
    expect(maskPhone(undefined)).toBeNull();
  });

  it('maskEmail deja la primera letra y el dominio', () => {
    expect(maskEmail('javier.mora@gmail.com')).toBe('j•••@gmail.com');
    expect(maskEmail('sin-arroba')).toBeNull();
  });
});

describe('rowMapper', () => {
  const form = bowlingForm();

  it('columnas: fijas + contacto visible + preguntas en orden', () => {
    expect(buildColumns(form).map(c => c.label)).toEqual([
      'Fecha de respuesta',
      'Tipo',
      'Placa',
      'Nombre completo',
      'Teléfono',
      'Correo',
      '¿Asistirás?',
      '¿Cuántos acompañantes llevas?',
      '¿Por qué no puedes ir?',
      '¿Cómo llegas?',
      '¿Qué quieres comer?',
      '¿Dónde te recogemos?',
    ]);
  });

  it('fila con textos legibles (Sí/No, etiquetas de opciones)', () => {
    const row = buildRow(form, buildColumns(form), {
      submittedAt: new Date('2026-10-24T00:30:00Z'), // 23/10 19:30 en Bogotá
      kind: 'placa',
      placa: '@MODJAVI001',
      contact: { fullName: 'Javier Montaño', phone: '3001234567' },
      answers: { attend: 'yes', companions: 1, transport: 'bus', snacks: ['pizza', 'veg'], pickup: 'Portal 80' },
    });
    expect(row[0]).toMatch(/23\/10\/2026/);
    expect(row.slice(1)).toEqual([
      'Joven (placa)',
      '@MODJAVI001',
      'Javier Montaño',
      '3001234567',
      '',
      'Sí',
      '1',
      '',
      'Bus de la iglesia',
      'Pizza, Vegetariano',
      'Portal 80',
    ]);
  });
});

describe('slug', () => {
  it('slugify quita tildes y símbolos', () => {
    expect(slugify('Salida a Bolos ¡Sábado!')).toBe('salida-a-bolos-sabado');
  });

  it('generateFormSlug agrega un sufijo y siempre es válido', () => {
    const slug = generateFormSlug('Fogata 🔥 2026');
    expect(slug).toMatch(/^fogata-2026-[a-f0-9]{6}$/);
    expect(SLUG_REGEX.test(slug)).toBe(true);
    expect(generateFormSlug('¡¡!!')).toMatch(/^formulario-[a-f0-9]{6}$/);
  });
});
