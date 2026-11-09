/**
 * Reglas para detectar jóvenes duplicados. Son puras (sin base de datos) y
 * deliberadamente conservadoras: en la iglesia hay hermanos y nombres
 * repetidos, así que solo proponen pares para que un admin decida.
 */

export interface DuplicateCandidate {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  birthday?: Date | string | null;
}

export type DuplicateLevel = 'high' | 'medium';

export interface DuplicateMatch {
  level: DuplicateLevel;
  reasons: string[];
}

const STOP_WORDS = new Set(['de', 'del', 'la', 'las', 'los', 'y']);

/** "José  de la Peña" → ["jose", "pena"] */
export const nameTokens = (fullName: string): string[] =>
  (fullName || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token && !STOP_WORDS.has(token));

/** Últimos 10 dígitos: "+57 300 123 4567" y "3001234567" son el mismo número. */
export const phoneKey = (phone?: string | null): string => {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : '';
};

export const emailKey = (email?: string | null): string => (email || '').trim().toLowerCase();

/**
 * "MM-DD" del cumpleaños. Se ignora el año a propósito: los registros antiguos
 * suelen tener el día correcto con un año de relleno.
 */
export const birthdayKey = (birthday?: Date | string | null): string => {
  if (!birthday) return '';
  const date = new Date(birthday);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(5, 10);
};

/** Identificador estable de un par, sin importar el orden. */
export const pairKey = (idA: string, idB: string): string => [idA, idB].sort().join(':');

const isSubset = (small: string[], big: string[]) => small.every(token => big.includes(token));

/** Compara dos jóvenes; null si no hay motivos para creer que son la misma persona. */
export const compareCandidates = (
  a: DuplicateCandidate,
  b: DuplicateCandidate
): DuplicateMatch | null => {
  const reasons: string[] = [];
  let level: DuplicateLevel | null = null;

  const phone = phoneKey(a.phone);
  if (phone && phone === phoneKey(b.phone)) {
    reasons.push('Mismo teléfono');
    level = 'high';
  }
  const email = emailKey(a.email);
  if (email && email === emailKey(b.email)) {
    reasons.push('Mismo correo');
    level = 'high';
  }

  const tokensA = nameTokens(a.fullName);
  const tokensB = nameTokens(b.fullName);
  if (tokensA.length && tokensA[0] === tokensB[0]) {
    const shared = tokensA.filter(token => tokensB.includes(token));
    const birthdayA = birthdayKey(a.birthday);
    const birthdayB = birthdayKey(b.birthday);
    const sameBirthday = !!birthdayA && birthdayA === birthdayB;
    const birthdayConflict = !!birthdayA && !!birthdayB && birthdayA !== birthdayB;

    if (shared.length >= 2 && sameBirthday) {
      reasons.push('Mismo nombre y apellido, con el mismo día de cumpleaños');
      level = 'high';
    } else if (!birthdayConflict) {
      const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
      const longer = shorter === tokensA ? tokensB : tokensA;
      const subset = isSubset(shorter, longer) && (shared.length >= 2 || sameBirthday);
      // Compartir el segundo nombre no dice nada ("Ana María Ruiz" / "Ana María Gil");
      // compartir el token final de alguno de los dos sí apunta a un apellido.
      const sharesSurname =
        shared.length >= 2 &&
        shared.some(token => token === tokensA[tokensA.length - 1] || token === tokensB[tokensB.length - 1]);
      if (subset || sharesSurname) {
        reasons.push('Nombre muy parecido');
        level = level ?? 'medium';
      }
    }
  }

  return level ? { level, reasons } : null;
};

export interface TargetCandidate {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  profileImage?: string | null;
  consentStatus?: string | null;
  hasPassword?: boolean;
  firstLogin?: boolean;
  createdAt?: Date | string | null;
}

const completeness = (y: TargetCandidate): number =>
  [y.email, y.phone, y.gender, y.profileImage].filter(Boolean).length +
  (y.consentStatus === 'current' ? 2 : 0) +
  (y.hasPassword && !y.firstLogin ? 1 : 0) +
  Math.min(nameTokens(y.fullName).length, 4) / 4;

/** Sugiere qué cuenta conservar: la más completa; si empatan, la más antigua. */
export const suggestTargetId = (a: TargetCandidate, b: TargetCandidate): string => {
  const scoreA = completeness(a);
  const scoreB = completeness(b);
  if (scoreA !== scoreB) return scoreA > scoreB ? a.id : b.id;
  return new Date(a.createdAt || 0).getTime() <= new Date(b.createdAt || 0).getTime() ? a.id : b.id;
};
