/** Partículas que no cuentan como nombre ni apellido ("Ana de la Cruz" → AC). */
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

/**
 * Iniciales para el avatar: primer nombre + primer apellido.
 * Con 4 o más palabras toma la 1.ª y la 3.ª (2 nombres + 2 apellidos:
 * "Javier Andrés Montaño Mora" → JM); con 2 o 3 toma la 1.ª y la 2.ª; con una,
 * solo su inicial.
 */
export const getInitials = (fullName: string | null | undefined): string => {
  const words = (fullName ?? '')
    .trim()
    .split(/\s+/)
    .filter(word => word && !PARTICLES.has(word.toLocaleLowerCase('es')));
  if (words.length === 0) return '?';
  const first = words[0];
  const surname = words.length >= 4 ? words[2] : words[1];
  return `${first[0]}${surname ? surname[0] : ''}`.toLocaleUpperCase('es');
};
