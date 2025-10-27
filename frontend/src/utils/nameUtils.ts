/**
 * Utilidades para nombres y avatares
 */

/**
 * Extrae las iniciales de un nombre completo
 * Ejemplos:
 * - "Adly Nieto" -> "AN"
 * - "Juan Pablo García" -> "JG"
 * - "María" -> "M"
 */
export const getInitials = (fullName: string): string => {
  if (!fullName || fullName.trim() === '') return '?';

  const words = fullName
    .trim()
    .split(' ')
    .filter(word => word.length > 0);

  if (words.length === 1) {
    // Solo un nombre: primera letra
    return words[0].charAt(0).toUpperCase();
  }

  // Múltiples palabras: primera letra del primero y última palabra
  const firstInitial = words[0].charAt(0).toUpperCase();
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase();

  return firstInitial + lastInitial;
};

/**
 * Genera un color de fondo según la posición en el ranking
 * Si no está en el ranking (rank undefined) o es 4+, usa azul oscuro
 * Si es top 3, usa el color de la medalla correspondiente
 */
export const getColorFromName = (_name: string, rank?: number): string => {
  // Top 1: Oro
  if (rank === 1) {
    return 'from-yellow-400 to-amber-500';
  }

  // Top 2: Plata
  if (rank === 2) {
    return 'from-gray-300 to-gray-500';
  }

  // Top 3: Bronce
  if (rank === 3) {
    return 'from-orange-400 to-orange-600';
  }

  // Posición 4+ o sin ranking: Azul oscuro
  return 'from-blue-600 to-blue-800';
};
