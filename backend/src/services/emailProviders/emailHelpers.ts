import env from '../../config/env';

/**
 * Utilidades compartidas por las plantillas de correo (emailTemplates y
 * brandEmails). Son funciones puras, sin red.
 */

/** Logo público y estable del frontend (no depende del hash de Vite). */
export const logoUrl = (): string => `${env.frontendUrl}/icon-512.png`;

/** Primer nombre para saludar ("Valentina Pérez" -> "Valentina"). */
export const firstName = (fullName: string): string =>
  (fullName || '').trim().split(/\s+/)[0] || fullName;

/** Escapa texto que viene de la base de datos antes de interpolarlo en HTML. */
export const escapeHtml = (
  value: string | number | null | undefined
): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Iniciales para el avatar cuando el joven no tiene foto: primera letra del
 * primer nombre y primera del último apellido ("Valentina Pérez" -> "VP").
 * Con un solo nombre devuelve una sola letra.
 */
export const getInitials = (fullName: string): string => {
  const words = (fullName || '')
    .split(/\s+/)
    .map(word => Array.from(word).find(ch => /\p{L}/u.test(ch)) || '')
    .filter(Boolean);
  if (words.length === 0) return '';
  const letters =
    words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return letters.join('').toLocaleUpperCase('es');
};

/** "17 nov 2026, 5:42 p. m." en hora de Bogotá. */
export const formatEmailDateTime = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};
