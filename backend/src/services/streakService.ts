import Streak from '../models/Streak';
import type { IStreakDocument } from '../models/Streak';
import {
    getStartOfWeekColombia,
    isSaturdayColombia,
} from '../utils/dateUtils';
import { AppError, DatabaseError, ErrorType } from '../utils/errorHandler';

/**
 * Calcula la fecha (Date) del sábado (00:00) de la semana de una fecha dada (TZ Colombia)
 */
const getSaturdayStart = (date: Date | string): Date => {
    const weekStart = getStartOfWeekColombia(date); // domingo 00:00
    const saturday = new Date(weekStart);
    saturday.setDate(weekStart.getDate() + 6);
    saturday.setHours(0, 0, 0, 0);
    return saturday;
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

        if (weeksBetween >= 3) {
            // Perdió por dos sábados consecutivos sin asistir
            streak.currentStreakWeeks = 1; // reinicia con el sábado actual
        } else {
            // weeksBetween 1 ó 2: mantiene la racha y suma 1
            streak.currentStreakWeeks += 1;
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


