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
