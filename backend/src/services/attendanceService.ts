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
    const attendancePoints = qrCode.points || 10;
    const tx = await pointsService.assignAttendancePoints(
      youngId,
      (qrCode._id as any).toString(),
      attendancePoints
    );
    const total = await pointsService.getTotalPoints(youngId);
    pointsInfo = { earned: tx.points, total, description: tx.description };
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
