import { Request, Response } from 'express';
import QRCodeModel from '../models/QRCode';
import AttendanceModel from '../models/Attendance';
import Young from '../models/Young';
import { ApiResponse } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import {
  getCurrentDateColombia,
  getCurrentDateTimeColombia,
  isExpired,
} from '../utils/dateUtils';
import { pointsService } from '../services/pointsService';

// Escanear QR y registrar asistencia (solo jóvenes)
export const scanQRAndRegisterAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.body; // Quitar points del request, ahora viene del QR
    const youngId = req.user?.userId;

    if (!youngId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Código QR requerido',
      });
      return;
    }

    // Verificar que el usuario es un joven (no admin)
    const isAdmin = req.user?.role_name === 'Super Admin';
    if (isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Los administradores no pueden registrar asistencia',
      });
      return;
    }

    // Buscar el QR code
    const qrCode = await QRCodeModel.findOne({
      code,
      isActive: true,
    });

    if (!qrCode) {
      res.status(404).json({
        success: false,
        message: 'Código QR inválido o no existe',
      });
      return;
    }

    // Verificar si el QR ha expirado
    if (isExpired(qrCode.expiresAt)) {
      res.status(400).json({
        success: false,
        message: 'El código QR ha expirado',
      });
      return;
    }

    const today = getCurrentDateColombia();

    // Verificar si el joven ya registró asistencia hoy
    const existingAttendance = await AttendanceModel.findOne({
      youngId,
      attendanceDate: today,
    });

    if (existingAttendance) {
      res.status(409).json({
        success: false,
        message: 'Ya registraste tu asistencia el día de hoy',
      });
      return;
    }

    // Crear nuevo registro de asistencia
    const attendance = new AttendanceModel({
      youngId,
      qrCodeId: qrCode._id,
      attendanceDate: today,
      scannedAt: getCurrentDateTimeColombia(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    });

    await attendance.save();

    // Incrementar contador de uso del QR
    await QRCodeModel.findByIdAndUpdate(qrCode._id, {
      $inc: { usageCount: 1 },
    });

    // ✨ NUEVO: Asignar puntos por asistencia
    let pointsTransaction = null;
    let totalPoints = 0;
    try {
      // Usar los puntos configurados en el QR
      const attendancePoints = qrCode.points || 10; // Default 10 si no está configurado
      pointsTransaction = await pointsService.assignAttendancePoints(
        youngId,
        (qrCode._id as any).toString(),
        attendancePoints
      );
      totalPoints = await pointsService.getTotalPoints(youngId);
    } catch (error) {
      // Si falla la asignación de puntos, solo logueamos pero no bloqueamos la asistencia
      console.warn(
        'No se pudieron asignar puntos (no hay temporada activa):',
        error
      );
    }

    // Obtener información del joven para la respuesta
    const young = await Young.findById(youngId).select('fullName placa');

    res.status(201).json({
      success: true,
      message: '¡Asistencia registrada exitosamente!',
      data: {
        attendance,
        young,
        attendanceDate: today,
        scannedAt: attendance.scannedAt,
        // ✨ NUEVO: Incluir información de puntos en la respuesta
        points: pointsTransaction
          ? {
              earned: pointsTransaction.points,
              total: totalPoints,
              description: pointsTransaction.description,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error registrando asistencia:', error);
    ErrorHandler.handleError(error, req, res);
  }
};

// Obtener historial de asistencias del joven autenticado
export const getMyAttendanceHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const youngId = req.user?.userId;

    if (!youngId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Obtener historial de asistencias
    const attendances = await AttendanceModel.find({ youngId })
      .sort({ attendanceDate: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('qrCodeId', 'generatedAt dailyDate')
      .lean();

    // Contar total de asistencias
    const totalAttendances = await AttendanceModel.countDocuments({ youngId });

    // Calcular estadísticas básicas usando zona horaria de Colombia
    const today = getCurrentDateColombia();
    const thisMonth = today.substring(0, 7); // YYYY-MM desde fecha de Colombia
    const thisMonthAttendances = await AttendanceModel.countDocuments({
      youngId,
      attendanceDate: { $regex: `^${thisMonth}` },
    });

    // Verificar si tiene asistencia hoy
    const todayAttendance = await AttendanceModel.findOne({
      youngId,
      attendanceDate: today,
    });

    res.status(200).json({
      success: true,
      message: 'Historial obtenido exitosamente',
      data: {
        attendances,
        stats: {
          totalAttendances,
          thisMonthAttendances,
          hasAttendanceToday: !!todayAttendance,
          todayAttendance,
        },
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalAttendances / Number(limit)),
          totalItems: totalAttendances,
          hasNextPage: skip + Number(limit) < totalAttendances,
          hasPreviousPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    ErrorHandler.handleError(error, req, res);
  }
};

// Obtener lista de asistencias por fecha específica (solo administradores)
export const getAttendancesByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.userId;

    if (!adminId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    // Verificar que el usuario es administrador (admin o Super Admin)
    const isAdmin = req.user?.role_name === 'Super Admin';
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver esta información',
      });
      return;
    }

    const { date } = req.params;

    // Validar formato de fecha
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: 'Formato de fecha inválido. Use YYYY-MM-DD',
      });
      return;
    }

    // Obtener asistencias de la fecha específica
    const attendances = await AttendanceModel.find({
      attendanceDate: date,
    })
      .populate('youngId', 'fullName placa group email profileImage')
      .populate('qrCodeId', 'generatedAt')
      .sort({ scannedAt: 1 })
      .lean();

    // Obtener total de jóvenes para estadísticas
    const totalYoung = await Young.countDocuments({
      role_name: { $nin: ['admin', 'Super Admin'] },
    });

    res.status(200).json({
      success: true,
      message: 'Lista de asistencias obtenida exitosamente',
      data: {
        attendances,
        date,
        stats: {
          totalPresent: attendances.length,
          totalYoung,
          attendancePercentage:
            totalYoung > 0
              ? Math.round((attendances.length / totalYoung) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo asistencias por fecha:', error);
    ErrorHandler.handleError(error, req, res);
  }
};

// Obtener lista de asistencias del día (solo administradores)
export const getTodayAttendances = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.userId;

    if (!adminId) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    // Verificar que el usuario es administrador (admin o Super Admin)
    const isAdmin = req.user?.role_name === 'Super Admin';
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver esta información',
      });
      return;
    }

    const today = getCurrentDateColombia();

    // Obtener asistencias del día
    const attendances = await AttendanceModel.find({
      attendanceDate: today,
    })
      .populate('youngId', 'fullName placa group email profileImage')
      .populate('qrCodeId', 'generatedAt')
      .sort({ scannedAt: 1 })
      .lean();

    // Obtener total de jóvenes para estadísticas
    const totalYoung = await Young.countDocuments({
      role_name: { $nin: ['admin', 'Super Admin'] },
    });

    res.status(200).json({
      success: true,
      message: 'Lista de asistencias obtenida exitosamente',
      data: {
        attendances,
        date: today,
        stats: {
          totalPresent: attendances.length,
          totalYoung,
          attendancePercentage:
            totalYoung > 0
              ? Math.round((attendances.length / totalYoung) * 100)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error obteniendo asistencias del día:', error);
    ErrorHandler.handleError(error, req, res);
  }
};

// Obtener estadísticas de asistencia por rango de fechas (solo administradores)
export const getAttendanceStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const isAdmin = req.user?.role_name === 'Super Admin';
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden ver esta información',
      });
      return;
    }

    const { startDate, endDate } = req.query;

    // Si no se proporcionan fechas, usar el mes actual en zona horaria de Colombia
    const todayColombia = getCurrentDateColombia();
    const start = startDate
      ? new String(startDate)
      : todayColombia.substring(0, 7) + '-01';
    const end = endDate ? new String(endDate) : todayColombia;

    // Obtener asistencias en el rango de fechas
    const attendances = await AttendanceModel.find({
      attendanceDate: {
        $gte: start,
        $lte: end,
      },
    })
      .populate('youngId', 'fullName placa group')
      .lean();

    // Agrupar por fecha
    const attendancesByDate = attendances.reduce(
      (acc: any, attendance: any) => {
        const date = attendance.attendanceDate;
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(attendance);
        return acc;
      },
      {}
    );

    res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: {
        attendancesByDate,
        totalAttendances: attendances.length,
        dateRange: { startDate: start, endDate: end },
      },
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    ErrorHandler.handleError(error, req, res);
  }
};
