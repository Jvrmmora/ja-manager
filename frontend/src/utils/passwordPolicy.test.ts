import { describe, expect, it } from 'vitest';
import {
  checkPassword,
  isPasswordValid,
  passwordStrength,
  strengthLabel,
} from './passwordPolicy';

describe('passwordPolicy', () => {
  it('acepta una contraseña que cumple todo', () => {
    expect(isPasswordValid('Modelia2026')).toBe(true);
    expect(isPasswordValid('Ab1@$!%*?&._-+=')).toBe(true);
  });

  it.each([
    ['corta', 'Ab1'],
    ['sin mayúscula', 'modelia2026'],
    ['sin minúscula', 'MODELIA2026'],
    ['sin número', 'ModeliaJoven'],
    ['con carácter no permitido', 'Modelia2026#'],
    ['con espacio', 'Modelia 2026'],
    ['de más de 50', 'Aa1' + 'x'.repeat(48)],
  ])('rechaza una contraseña %s', (_label, pw) => {
    expect(isPasswordValid(pw)).toBe(false);
  });

  it('los cuatro requisitos básicos siempre se listan', () => {
    expect(checkPassword('').map(c => c.id)).toEqual([
      'length',
      'upper',
      'lower',
      'digit',
    ]);
  });

  it('agrega un quinto requisito solo si hay un carácter no permitido', () => {
    const ids = checkPassword('Modelia2026#').map(c => c.id);
    expect(ids).toContain('chars');
    expect(checkPassword('Modelia2026').map(c => c.id)).not.toContain('chars');
  });

  it('fuerza de 0 a 4 y etiqueta', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('modelia1')).toBe(3);
    expect(passwordStrength('Modelia2026')).toBe(4);
    expect(strengthLabel(4, 'Modelia2026')).toBe('Fuerte');
    expect(strengthLabel(0, '')).toBe('');
  });
});
