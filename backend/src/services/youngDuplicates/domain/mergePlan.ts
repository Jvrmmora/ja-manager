import { formatDateColombia } from '../../../utils/dateUtils';

/**
 * Decide qué hacer al fusionar dos jóvenes (origen → destino), sin tocar la
 * base. Lo que solo puede existir una vez por persona (asistencia del día,
 * cumpleaños del año, respuesta a un formulario…) se resuelve conservando lo
 * del destino y descartando lo del origen, para no duplicar puntos.
 */

export interface MergeProfile {
  fullName?: string;
  placa?: string | null;
  password?: string | null;
  first_login?: boolean;
  phone?: string | null;
  email?: string | null;
  birthday?: Date | null;
  ageRange?: string;
  gender?: string | null;
  profileImage?: string | null;
  group?: number | null;
  skills?: string[];
  referredBy?: unknown;
  birthdayPointsClaimed?: Date | null;
  dataConsent?: { status?: string } | null;
}

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

export interface FieldMerge {
  set: Record<string, unknown>;
  /** Campos que el destino gana del origen (para la vista previa). */
  filled: string[];
  /** La placa pasa del origen al destino (el destino no tenía). */
  movesPlaca: boolean;
}

/** El destino conserva lo que ya tiene; solo se completa lo que le falta. */
export const buildFieldMerge = (
  target: MergeProfile,
  source: MergeProfile,
  ids: { sourceId: string; targetId: string }
): FieldMerge => {
  const set: Record<string, unknown> = {};
  const filled: string[] = [];
  const fill = (field: keyof MergeProfile) => {
    if (isEmpty(target[field]) && !isEmpty(source[field])) {
      set[field] = source[field];
      filled.push(field);
    }
  };

  (['phone', 'email', 'birthday', 'gender', 'profileImage', 'group'] as const).forEach(fill);
  // El rango de edad debe corresponder a la fecha de nacimiento que queda
  if (set.birthday && source.ageRange) set.ageRange = source.ageRange;

  const skills = [...new Set([...(target.skills || []), ...(source.skills || [])])];
  if (skills.length !== (target.skills || []).length) {
    set.skills = skills;
    filled.push('skills');
  }

  const sourceReferrer = source.referredBy ? String(source.referredBy) : '';
  if (!target.referredBy && sourceReferrer && sourceReferrer !== ids.targetId) {
    set.referredBy = source.referredBy;
    filled.push('referredBy');
  }
  // Si uno había referido al otro, tras fusionar sería auto-referido
  if (target.referredBy && String(target.referredBy) === ids.sourceId) set.referredBy = null;

  const claims = [target.birthdayPointsClaimed, source.birthdayPointsClaimed].filter(Boolean) as Date[];
  if (claims.length) {
    const latest = new Date(Math.max(...claims.map(date => new Date(date).getTime())));
    if (!target.birthdayPointsClaimed || latest.getTime() !== new Date(target.birthdayPointsClaimed).getTime()) {
      set.birthdayPointsClaimed = latest;
    }
  }

  if (target.dataConsent?.status !== 'current' && source.dataConsent?.status === 'current') {
    set.dataConsent = source.dataConsent;
    filled.push('dataConsent');
  }

  const movesPlaca = isEmpty(target.placa) && !isEmpty(source.placa);
  if (movesPlaca) {
    set.placa = source.placa;
    filled.push('placa');
  }
  if (isEmpty(target.password) && !isEmpty(source.password)) {
    set.password = source.password;
    set.first_login = source.first_login ?? false;
    filled.push('password');
  }

  return { set, filled, movesPlaca };
};

export interface AttendanceLite {
  id: string;
  attendanceDate: string;
  qrCodeId: string;
}

export interface TransactionLite {
  id: string;
  type: string;
  points: number;
  seasonId: string;
  createdAt: Date;
  eventId?: string | null;
  referredYoungId?: string | null;
  description?: string | null;
}

export interface StreakLite {
  id: string;
  seasonId: string;
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  lastAttendanceSaturday?: Date | null;
  violetFlameAwarded: boolean;
  violetFlameAwardedAt?: Date | null;
}

export interface ResponseLite {
  id: string;
  formId: string;
  attending?: boolean | null;
  pointsTransactionId?: string | null;
}

export interface MergeHistory {
  attendances: AttendanceLite[];
  transactions: TransactionLite[];
  streaks: StreakLite[];
  responses: ResponseLite[];
}

export interface MergeResolution {
  deleteAttendanceIds: string[];
  deleteTransactionIds: string[];
  deleteStreakIds: string[];
  deleteResponseIds: string[];
  streakPatches: { id: string; set: Record<string, unknown> }[];
  responseLinks: { id: string; pointsTransactionId: string }[];
  seatReleases: { formId: string; count: number }[];
  conflicts: {
    attendances: number;
    formResponses: number;
    birthdays: number;
    welcomeBonus: number;
    violetFlame: number;
    selfReferrals: number;
    streaks: number;
  };
}

const bogotaYear = (date: Date) => formatDateColombia(date).slice(0, 4);
const isVioletFlame = (tx: TransactionLite) => tx.type === 'BONUS' && !!tx.description?.includes('Llama Violeta');
const isReferralTx = (tx: TransactionLite) => tx.type === 'REFERRAL_BONUS' || tx.type === 'REFERRAL_WELCOME';

export const resolveMergeConflicts = (
  source: MergeHistory,
  target: MergeHistory,
  ids: { sourceId: string; targetId: string }
): MergeResolution => {
  const deleteTx = new Set<string>();

  // Asistencia: una por día (índice único youngId + attendanceDate)
  const targetDates = new Set(target.attendances.map(a => a.attendanceDate));
  const dupAttendances = source.attendances.filter(a => targetDates.has(a.attendanceDate));
  const dupQrCodes = new Set(dupAttendances.map(a => a.qrCodeId));
  source.transactions
    .filter(tx => tx.type === 'ATTENDANCE' && tx.eventId && dupQrCodes.has(tx.eventId))
    .forEach(tx => deleteTx.add(tx.id));

  // Cumpleaños: uno por año
  const targetBirthdayYears = new Set(
    target.transactions.filter(tx => tx.type === 'BIRTHDAY').map(tx => bogotaYear(tx.createdAt))
  );
  const dupBirthdays = source.transactions.filter(
    tx => tx.type === 'BIRTHDAY' && targetBirthdayYears.has(bogotaYear(tx.createdAt))
  );
  dupBirthdays.forEach(tx => deleteTx.add(tx.id));

  // Bienvenida por referido: una por persona
  const dupWelcome = target.transactions.some(tx => tx.type === 'REFERRAL_WELCOME')
    ? source.transactions.filter(tx => tx.type === 'REFERRAL_WELCOME')
    : [];
  dupWelcome.forEach(tx => deleteTx.add(tx.id));

  // Llama Violeta: una por temporada
  const targetFlames = new Set(target.transactions.filter(isVioletFlame).map(tx => tx.seasonId));
  const dupFlames = source.transactions.filter(tx => isVioletFlame(tx) && targetFlames.has(tx.seasonId));
  dupFlames.forEach(tx => deleteTx.add(tx.id));

  // Referidos entre las dos cuentas: serían auto-referidos
  const pair = new Set([ids.sourceId, ids.targetId]);
  const selfReferrals = [...source.transactions, ...target.transactions].filter(
    tx => isReferralTx(tx) && !!tx.referredYoungId && pair.has(tx.referredYoungId)
  );
  selfReferrals.forEach(tx => deleteTx.add(tx.id));

  // Rachas: una por temporada
  const deleteStreakIds: string[] = [];
  const streakPatches: MergeResolution['streakPatches'] = [];
  for (const streak of source.streaks) {
    const other = target.streaks.find(s => s.seasonId === streak.seasonId);
    if (!other) continue;
    deleteStreakIds.push(streak.id);
    const sourceIsNewer =
      new Date(streak.lastAttendanceSaturday || 0).getTime() > new Date(other.lastAttendanceSaturday || 0).getTime();
    streakPatches.push({
      id: other.id,
      set: {
        bestStreakWeeks: Math.max(streak.bestStreakWeeks, other.bestStreakWeeks),
        currentStreakWeeks: sourceIsNewer ? streak.currentStreakWeeks : other.currentStreakWeeks,
        lastAttendanceSaturday: sourceIsNewer ? streak.lastAttendanceSaturday : other.lastAttendanceSaturday,
        violetFlameAwarded: streak.violetFlameAwarded || other.violetFlameAwarded,
        violetFlameAwardedAt: other.violetFlameAwardedAt ?? streak.violetFlameAwardedAt ?? null,
      },
    });
  }

  // Formularios: una respuesta por joven y formulario; queda la del destino
  const deleteResponseIds: string[] = [];
  const responseLinks: MergeResolution['responseLinks'] = [];
  const seats = new Map<string, number>();
  for (const response of source.responses) {
    const other = target.responses.find(r => r.formId === response.formId);
    if (!other) continue;
    deleteResponseIds.push(response.id);
    if (response.attending !== false) seats.set(response.formId, (seats.get(response.formId) || 0) + 1);
    if (response.pointsTransactionId) {
      if (other.pointsTransactionId) deleteTx.add(response.pointsTransactionId);
      else responseLinks.push({ id: other.id, pointsTransactionId: response.pointsTransactionId });
    }
  }

  return {
    deleteAttendanceIds: dupAttendances.map(a => a.id),
    deleteTransactionIds: [...deleteTx],
    deleteStreakIds,
    deleteResponseIds,
    streakPatches,
    responseLinks,
    seatReleases: [...seats].map(([formId, count]) => ({ formId, count })),
    conflicts: {
      attendances: dupAttendances.length,
      formResponses: deleteResponseIds.length,
      birthdays: dupBirthdays.length,
      welcomeBonus: dupWelcome.length,
      violetFlame: dupFlames.length,
      selfReferrals: selfReferrals.length,
      streaks: deleteStreakIds.length,
    },
  };
};
