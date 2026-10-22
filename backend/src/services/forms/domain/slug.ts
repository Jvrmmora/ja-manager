import crypto from 'crypto';

/** "Salida a Bolos ¡Sábado!" → "salida-a-bolos-sabado" */
export const slugify = (text: string): string =>
  (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');

/**
 * Slug público con sufijo aleatorio corto: legible para compartir por
 * WhatsApp y sin que se puedan adivinar formularios en borrador.
 */
export const generateFormSlug = (title: string): string => {
  const base = slugify(title) || 'formulario';
  const suffix = crypto.randomBytes(3).toString('hex'); // 6 caracteres
  return `${base}-${suffix}`;
};

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
