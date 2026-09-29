import { describe, expect, it } from 'vitest';
import { buildLoginUrl } from './loginUrl';

describe('buildLoginUrl', () => {
  it('apunta a /login, no a la raíz (la raíz es la landing pública)', () => {
    expect(buildLoginUrl('@MODADRI069')).toBe(
      'https://www.jovenesmodelia.com/login?placa=%40MODADRI069'
    );
  });

  it('apunta a /login incluso sin placa', () => {
    expect(buildLoginUrl()).toBe('https://www.jovenesmodelia.com/login');
    expect(buildLoginUrl(null)).toBe('https://www.jovenesmodelia.com/login');
    expect(buildLoginUrl('')).toBe('https://www.jovenesmodelia.com/login');
  });

  it('nunca genera un link a la raíz "/" seguido de "?placa="', () => {
    const url = buildLoginUrl('@MODADRI069');
    expect(url).not.toMatch(/jovenesmodelia\.com\/\?placa=/);
  });
});
