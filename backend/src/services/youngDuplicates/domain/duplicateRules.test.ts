import {
  birthdayKey,
  compareCandidates,
  nameTokens,
  pairKey,
  phoneKey,
  suggestTargetId,
} from './duplicateRules';

const person = (id: string, fullName: string, extra: Record<string, unknown> = {}) => ({ id, fullName, ...extra });

describe('normalización', () => {
  it('quita tildes, mayúsculas y conectores', () => {
    expect(nameTokens('  José  de la PEÑA ')).toEqual(['jose', 'pena']);
  });

  it('compara teléfonos por los últimos 10 dígitos', () => {
    expect(phoneKey('+57 300 123 4567')).toBe(phoneKey('3001234567'));
    expect(phoneKey('123')).toBe('');
    expect(phoneKey(undefined)).toBe('');
  });

  it('el cumpleaños ignora el año', () => {
    expect(birthdayKey('2025-10-21T00:00:00.000Z')).toBe(birthdayKey('1995-10-21T00:00:00.000Z'));
    expect(birthdayKey(null)).toBe('');
  });

  it('pairKey no depende del orden', () => {
    expect(pairKey('b', 'a')).toBe(pairKey('a', 'b'));
  });
});

describe('compareCandidates', () => {
  it('registro incompleto vs. registro nuevo: nombre + apellido + día de cumpleaños', () => {
    const match = compareCandidates(
      person('1', 'Pedro Ramirez', { birthday: '2025-03-14' }),
      person('2', 'Pedro Antonio Ramírez Soto', { birthday: '1998-03-14', email: 'p@x.com', phone: '3001112233' })
    );
    expect(match?.level).toBe('high');
  });

  it('mismo teléfono o correo es señal fuerte aunque cambie el nombre', () => {
    expect(
      compareCandidates(person('1', 'Ana', { phone: '+573001234567' }), person('2', 'Maria', { phone: '3001234567' }))?.level
    ).toBe('high');
    expect(
      compareCandidates(person('1', 'Ana', { email: 'A@x.com' }), person('2', 'Maria', { email: 'a@x.com ' }))?.reasons
    ).toEqual(['Mismo correo']);
  });

  it('nombre incompleto contenido en otro: posible duplicado', () => {
    expect(compareCandidates(person('1', 'Juan david'), person('2', 'Juan David Mateus'))?.level).toBe('medium');
  });

  it('mismo nombre y un apellido en distinta posición: posible duplicado', () => {
    expect(compareCandidates(person('1', 'Luis Andrés Gomez'), person('2', 'Luis Gomez Castillo'))?.level).toBe('medium');
  });

  it('cumpleaños distintos descartan un parecido solo por nombre', () => {
    expect(
      compareCandidates(
        person('1', 'Luis Gomez', { birthday: '1990-01-01' }),
        person('2', 'Luis Gomez Castillo', { birthday: '1990-06-06' })
      )
    ).toBeNull();
  });

  it('hermanos con los mismos apellidos no son duplicados', () => {
    expect(compareCandidates(person('1', 'Lina Torres Vega'), person('2', 'Marco Torres Vega'))).toBeNull();
  });

  it('compartir solo los dos nombres de pila no basta', () => {
    expect(compareCandidates(person('1', 'Ana Maria Ruiz'), person('2', 'Ana Maria Gil'))).toBeNull();
  });

  it('mismo primer nombre y nada más no es duplicado', () => {
    expect(compareCandidates(person('1', 'Carlos Melo'), person('2', 'Carlos Rojas'))).toBeNull();
  });
});

describe('suggestTargetId', () => {
  it('prefiere la cuenta con más datos y consentimiento', () => {
    expect(
      suggestTargetId(
        { id: 'old', fullName: 'Pedro Ramirez', createdAt: '2025-01-01', hasPassword: true, firstLogin: true },
        {
          id: 'new',
          fullName: 'Pedro Antonio Ramirez Soto',
          createdAt: '2026-01-01',
          email: 'p@x.com',
          phone: '300',
          consentStatus: 'current',
          hasPassword: true,
          firstLogin: false,
        }
      )
    ).toBe('new');
  });

  it('si empatan, la más antigua', () => {
    expect(
      suggestTargetId(
        { id: 'new', fullName: 'Ana Ruiz', createdAt: '2026-01-01' },
        { id: 'old', fullName: 'Ana Ruiz', createdAt: '2025-01-01' }
      )
    ).toBe('old');
  });
});
