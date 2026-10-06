import { SITE_ORIGIN } from './loginUrl';

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Enlace público (requiere sesión) a la vista completa del ranking. */
export const buildRankingShareUrl = (): string => `${SITE_ORIGIN}/ranking`;

/**
 * Enlace a la vista de cumpleaños. `monthIndex` es 0-11 (como Date#getMonth),
 * pero en la URL va 1-12 para que sea legible: /cumpleanos?mes=10&grupo=1.
 */
export const buildBirthdayShareUrl = (monthIndex: number, group: number): string =>
  `${SITE_ORIGIN}/cumpleanos?mes=${monthIndex + 1}&grupo=${group}`;

export const rankingShareMessage = (url: string, seasonName?: string): string =>
  `🏆 *Ranking ${seasonName ? `de la ${seasonName}` : 'de la temporada'}*\n` +
  '¡Arranca una nueva semana! Mira quién va liderando y en qué puesto vas tú 👇\n\n' +
  url;

export const birthdayShareMessage = (url: string, monthIndex: number): string =>
  `🎂 *¡Feliz cumpleaños a los que celebran en ${MONTH_NAMES[monthIndex]}!*\n` +
  'Mira quiénes son y no olvides saludarlos 🎉👇\n\n' +
  url;

/** Lee ?mes=1-12 → índice 0-11; null si falta o es inválido. */
export const parseMonthParam = (value: string | null): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n - 1 : null;
};

/** Lee ?grupo=1-5; null si falta o es inválido. */
export const parseGroupParam = (value: string | null): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

/**
 * Enlace de invitación: abre el registro con la placa de quien invita ya
 * escrita (RegistrationPage lee ?referredBy=). La "@" va codificada para que
 * WhatsApp no confunda el enlace con un correo al volverlo clickeable.
 */
export const buildReferralUrl = (placa: string): string =>
  `${SITE_ORIGIN}/register?referredBy=${encodeURIComponent(placa)}`;

export const referralShareMessage = (
  url: string,
  placa: string,
  welcomePoints?: number
): string =>
  '¡Hola! Te invito a unirte a *Jóvenes Modelia* 🔥\n' +
  `Regístrate con mi placa *${placa}*` +
  (welcomePoints ? ` y recibes ${welcomePoints} puntos de bienvenida 🎁` : ' y ganamos puntos los dos 🎁') +
  `\n\n${url}`;
