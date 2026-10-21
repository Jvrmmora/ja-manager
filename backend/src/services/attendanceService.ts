import QRCodeModel from '../models/QRCode';
import AttendanceModel from '../models/Attendance';
import Young from '../models/Young';
import { pointsService } from './pointsService';
import { getCurrentDateColombia } from '../utils/dateUtils';

interface RegisterAttendanceMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface RegisterAttendanceResult {
  attendance: any;
  young: any;
  attendanceDate: string;
  scannedAt: Date;
  points: null | {
    earned: number;
    basePoints: number;
    speedBonus: number;
    total: number;
    description?: string;
  };
}

/**
 * Lógica central para registrar asistencia reutilizable.
 */
export const registerAttendanceCore = async (
  youngId: string,
  qrCode: any,
  meta: RegisterAttendanceMeta = {}
): Promise<RegisterAttendanceResult> => {
  const today = getCurrentDateColombia();

  const existingAttendance = await AttendanceModel.findOne({
    youngId,
    attendanceDate: today,
  });
  if (existingAttendance) {
    throw new Error('ALREADY_REGISTERED');
  }

  const attendance = new AttendanceModel({
    youngId,
    qrCodeId: qrCode._id,
    attendanceDate: today,
    scannedAt: new Date(),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  await attendance.save();

  await QRCodeModel.findByIdAndUpdate(qrCode._id, { $inc: { usageCount: 1 } });

  let pointsInfo: RegisterAttendanceResult['points'] = null;
  try {
    // Calcular bonus por velocidad
    const basePoints = qrCode.points || 10;
    const speedBonus = qrCode.getCurrentSpeedBonus
      ? qrCode.getCurrentSpeedBonus()
      : 0;
    const totalPoints = basePoints + speedBonus;

    // Calcular tiempo de escaneo en segundos
    const timeToScanSeconds = Math.floor(
      (new Date().getTime() - qrCode.generatedAt.getTime()) / 1000
    );

    const tx = await pointsService.assignAttendancePoints(
      youngId,
      (qrCode._id as any).toString(),
      totalPoints,
      speedBonus,
      timeToScanSeconds
    );
    const total = await pointsService.getTotalPoints(youngId);
    pointsInfo = {
      earned: tx.points,
      basePoints,
      speedBonus,
      total,
      description: tx.description,
    };
  } catch (err) {
    console.warn('No se pudieron asignar puntos (pointsService)', err);
  }

  const young = await Young.findById(youngId).select('fullName placa');

  return {
    attendance,
    young,
    attendanceDate: today,
    scannedAt: attendance.scannedAt,
    points: pointsInfo,
  };
};

export interface AttendanceCalendarDay {
  date: string; // YYYY-MM-DD (Colombia)
  kind: 'CULTO' | 'ACTIVIDAD';
  attendees: number;
  qrCount: number;
  points: number; // puntos base del QR del día (el mayor si hubo varios)
}

/**
 * Resumen anual para el calendario de asistencias del admin: un registro
 * por cada día con QR generado. Los sábados son "culto joven"; cualquier
 * otro día con QR se considera "actividad".
 */
export const getAttendanceCalendar = async (
  year: number
): Promise<AttendanceCalendarDay[]> => {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [qrDays, attendanceDays] = await Promise.all([
    QRCodeModel.aggregate([
      { $match: { dailyDate: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$dailyDate',
          qrCount: { $sum: 1 },
          points: { $max: '$points' },
        },
      },
    ]),
    AttendanceModel.aggregate([
      { $match: { attendanceDate: { $gte: from, $lte: to } } },
      { $group: { _id: '$attendanceDate', attendees: { $sum: 1 } } },
    ]),
  ]);

  const attendeesByDate = new Map<string, number>(
    attendanceDays.map((d: any) => [d._id as string, d.attendees as number])
  );

  return qrDays
    .map((d: any) => {
      const date = d._id as string;
      // Mediodía UTC: el día de la semana no depende del TZ del proceso
      const isSaturday = new Date(`${date}T12:00:00Z`).getUTCDay() === 6;
      return {
        date,
        kind: isSaturday ? ('CULTO' as const) : ('ACTIVIDAD' as const),
        attendees: attendeesByDate.get(date) || 0,
        qrCount: d.qrCount,
        points: d.points || 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
};
