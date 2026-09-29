import Streak from '../models/Streak';
import type { IStreakDocument } from '../models/Streak';
import QRCode from '../models/QRCode';
import {
    getStartOfWeekColombia,
    isSaturdayColombia,
} from '../utils/dateUtils';
import { AppError, DatabaseError, ErrorType } from '../utils/errorHandler';

/**
 * Calcula la fecha (Date) del sábado (00:00) de la semana de una fecha dada (TZ Colombia)
 */
export const getSaturdayStart = (date: Date | string): Date => {
    const weekStart = getStartOfWeekColombia(date); // domingo 00:00
    const saturday = new Date(weekStart);
    saturday.setDate(weekStart.getDate() + 6);
    saturday.setHours(0, 0, 0, 0);
    return saturday;
};

/**
 * Sábados (Date, medianoche) estrictamente entre `from` y `to` (ambos exclusivos).
 * `from`/`to` deben venir de getSaturdayStart, para que la aritmética de días
 * sea segura sin importar el TZ del proceso.
 */
const saturdaysBetween = (from: Date, to: Date): Date[] => {
    const result: Date[] = [];
    const cursor = new Date(from);
    cursor.setDate(cursor.getDate() + 7);
    while (cursor.getTime() < to.getTime()) {
        result.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 7);
    }
    return result;
};

// `date` viene de getSaturdayStart/saturdaysBetween, que ya "hornean" el
// año/mes/día de Colombia en los getters locales del proceso (igual que
// getCurrentDateTimeColombia) — por eso aquí se leen directo, sin volver a
// pasar por Intl con timeZone, que reintroduciría el desfase.
const toColombiaDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Fechas (YYYY-MM-DD) con al menos un QR generado dentro de [from, to] (Colombia).
 * Se usa para distinguir "sábado sin culto joven" (no cuenta contra la racha)
 * de "sábado con culto joven al que no asistió" (sí cuenta).
 */
export const getEventDateKeysBetween = async (
    from: Date,
    to: Date
): Promise<Set<string>> => {
    const found = await QRCode.distinct('dailyDate', {
        dailyDate: { $gte: toColombiaDateKey(from), $lte: toColombiaDateKey(to) },
    });
    return new Set(found as string[]);
};

/**
 * Cuenta, entre `from` y `to` (exclusivos), cuántos sábados tuvieron un QR
 * real generado (culto joven) — los sábados sin QR no cuentan como falta.
 */
const countRealMissedSaturdays = async (
    from: Date,
    to: Date
): Promise<number> => {
    const candidates = saturdaysBetween(from, to);
    if (candidates.length === 0) return 0;

    const eventKeys = await getEventDateKeysBetween(from, to);
    return candidates.filter(d => eventKeys.has(toColombiaDateKey(d))).length;
};

/**
 * Racha "efectiva" para mostrar en lecturas (leaderboard, posición, desglose):
 * si desde la última asistencia hay 2+ sábados con culto joven real sin
 * asistir, se considera perdida aunque el contador en BD no se haya
 * actualizado todavía (no hay cron que la resetee proactivamente). Los
 * sábados sin QR (no hubo culto) nunca cuentan para este cálculo.
 */
export const computeEffectiveStreak = (
    storedStreakWeeks: number,
    lastAttendanceSaturday: Date | string | null | undefined,
    currentSaturday: Date,
    eventDateKeys: Set<string>
): number => {
    if (!storedStreakWeeks || !lastAttendanceSaturday) {
        return storedStreakWeeks || 0;
    }

    const last =
        typeof lastAttendanceSaturday === 'string'
            ? new Date(lastAttendanceSaturday)
            : lastAttendanceSaturday;

    if (currentSaturday.getTime() <= last.getTime()) {
        return storedStreakWeeks;
    }

    const missed = saturdaysBetween(last, currentSaturday).filter(d =>
        eventDateKeys.has(toColombiaDateKey(d))
    ).length;

    return missed >= 2 ? 0 : storedStreakWeeks;
};

/**
 * Actualiza racha al registrar una asistencia. Solo cuentan sábados.
 * Retorna el documento de racha y un flag que indica si corresponde otorgar la Llama Violeta.
 */
export const updateStreakOnAttendance = async (
    youngId: string,
    seasonId: string,
    attendanceDate: Date | string
): Promise<{ streak: IStreakDocument; awardVioletFlame: boolean } | null> => {

    if (!isSaturdayColombia(attendanceDate)) {
        return null;
    }

    const saturday = getSaturdayStart(attendanceDate);
    let streak = await Streak.getOrCreate(youngId, seasonId);

    //Evitar procesar dos veces el mismo sábado
    if (
        streak.lastAttendanceSaturday &&
        streak.lastAttendanceSaturday.getTime() === saturday.getTime()
    ) {
        return { streak, awardVioletFlame: false };
    }

    if (!streak.lastAttendanceSaturday) {
        streak.currentStreakWeeks = 1;
    } else {
        const diffMs = saturday.getTime() - streak.lastAttendanceSaturday.getTime();
        const weeksBetween = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

        if (weeksBetween <= 0) {
            // fecha desordenada o misma semana
            return { streak, awardVioletFlame: false };
        }

        if (weeksBetween <= 2) {
            // 0 ó 1 sábado de hueco: se tolera sin necesidad de revisar si hubo culto.
            streak.currentStreakWeeks += 1;
        } else {
            // 2+ sábados de hueco: solo cuentan como falta los que tuvieron culto
            // joven real (QR generado). Un sábado sin culto no rompe la racha.
            const missedWithEvent = await countRealMissedSaturdays(
                streak.lastAttendanceSaturday,
                saturday
            );
            streak.currentStreakWeeks =
                missedWithEvent >= 2 ? 1 : streak.currentStreakWeeks + 1;
        }
    }

    streak.lastAttendanceSaturday = saturday;
    if (streak.currentStreakWeeks > streak.bestStreakWeeks) {
        streak.bestStreakWeeks = streak.currentStreakWeeks;
    }

    let awardVioletFlame = false;
    if (streak.currentStreakWeeks >= 4 && !streak.violetFlameAwarded) {
        // Marcar como otorgada de forma atómica al guardar
        streak.violetFlameAwarded = true;
        streak.violetFlameAwardedAt = new Date();
        awardVioletFlame = true;
    }

    try {
        const savedStreak = await streak.save();
        return { streak: savedStreak as IStreakDocument, awardVioletFlame };
    } catch (error: any) {
        throw new DatabaseError('Error al actualizar la racha', error);
    }
};

export default {
    updateStreakOnAttendance,
};


