import { describe, expect, it } from 'vitest';
import { getInitials } from './initials';

describe('getInitials', () => {
  it('nombre + apellido', () => {
    expect(getInitials('Javier Montaño')).toBe('JM');
  });

  it('2 nombres y 2 apellidos toma el primer apellido', () => {
    expect(getInitials('Javier Andrés Montaño Mora')).toBe('JM');
  });

  it('3 palabras toma la 1.ª y la 2.ª', () => {
    expect(getInitials('Ana María Gómez')).toBe('AM');
  });

  it('ignora partículas y espacios extra', () => {
    expect(getInitials('  ana   de la Cruz ')).toBe('AC');
  });

  it('una sola palabra o vacío', () => {
    expect(getInitials('Camila')).toBe('C');
    expect(getInitials('')).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });

  it('respeta tildes y mayúsculas', () => {
    expect(getInitials('álvaro ñúñez')).toBe('ÁÑ');
  });
});
