import { describe, expect, it } from 'vitest';
import {
  buildBirthdayShareUrl,
  buildReferralUrl,
  referralShareMessage,
  buildRankingShareUrl,
  birthdayShareMessage,
  parseGroupParam,
  parseMonthParam,
  rankingShareMessage,
} from './shareUrls';
import { buildLoginRedirect, safeReturnUrl } from './loginUrl';

describe('enlaces para compartir', () => {
  it('el ranking apunta a /ranking del dominio público', () => {
    expect(buildRankingShareUrl()).toBe('https://www.jovenesmodelia.com/ranking');
  });

  it('cumpleaños usa mes 1-12 en la URL', () => {
    expect(buildBirthdayShareUrl(9, 1)).toBe(
      'https://www.jovenesmodelia.com/cumpleanos?mes=10&grupo=1'
    );
  });

  it('los mensajes incluyen la URL y el contexto', () => {
    expect(rankingShareMessage('U', 'Temporada Q2 2026')).toContain('Temporada Q2 2026');
    expect(rankingShareMessage('U')).toMatch(/U$/);
    expect(birthdayShareMessage('U', 9)).toContain('Octubre');
  });
});

describe('parámetros de la vista de cumpleaños', () => {
  it('convierte ?mes=1-12 a índice 0-11', () => {
    expect(parseMonthParam('10')).toBe(9);
    expect(parseMonthParam('1')).toBe(0);
  });

  it('rechaza meses y grupos inválidos', () => {
    expect(parseMonthParam(null)).toBeNull();
    expect(parseMonthParam('13')).toBeNull();
    expect(parseMonthParam('abc')).toBeNull();
    expect(parseGroupParam('0')).toBeNull();
    expect(parseGroupParam('6')).toBeNull();
    expect(parseGroupParam('3')).toBe(3);
  });
});

describe('safeReturnUrl', () => {
  it('acepta rutas internas', () => {
    expect(safeReturnUrl('/ranking')).toBe('/ranking');
    expect(safeReturnUrl('/cumpleanos?mes=10&grupo=1')).toBe('/cumpleanos?mes=10&grupo=1');
  });

  it('rechaza redirecciones abiertas y bucles a /login', () => {
    expect(safeReturnUrl('https://evil.com')).toBeNull();
    expect(safeReturnUrl('//evil.com')).toBeNull();
    expect(safeReturnUrl('/\\evil.com')).toBeNull();
    expect(safeReturnUrl('/login?returnUrl=/x')).toBeNull();
    expect(safeReturnUrl(null)).toBeNull();
  });

  it('buildLoginRedirect codifica la ruta de regreso', () => {
    expect(buildLoginRedirect('/cumpleanos?mes=10')).toBe(
      '/login?returnUrl=%2Fcumpleanos%3Fmes%3D10'
    );
  });
});

describe('enlace de invitación (referidos)', () => {
  it('apunta a /register con la placa codificada', () => {
    expect(buildReferralUrl('@MODZAIR052')).toBe(
      'https://www.jovenesmodelia.com/register?referredBy=%40MODZAIR052'
    );
  });

  it('RegistrationPage recupera la placa tal cual desde el enlace', () => {
    const url = new URL(buildReferralUrl('@MODZAIR052'));
    expect(url.pathname).toBe('/register');
    expect(url.searchParams.get('referredBy')).toBe('@MODZAIR052');
  });

  it('el mensaje incluye placa, puntos de bienvenida y enlace', () => {
    const msg = referralShareMessage('U', '@MODZAIR052', 10);
    expect(msg).toContain('@MODZAIR052');
    expect(msg).toContain('10 puntos de bienvenida');
    expect(msg).toMatch(/U$/);
    expect(referralShareMessage('U', '@MODZAIR052')).toContain('ganamos puntos los dos');
  });
});
