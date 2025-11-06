import { Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import QRCodeModel from '../models/QRCode';
import AttendanceModel from '../models/Attendance';
import { ApiResponse } from '../types';
import { ErrorHandler } from '../utils/errorHandler';
import {
  getCurrentDateColombia,
  getCurrentDateTimeColombia,
  createExpirationDate,
  isExpired,
} from '../utils/dateUtils';

// Generar QR del día (solo administradores)
export const generateDailyQR = async (
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
        message: 'Solo los administradores pueden generar códigos QR',
      });
      return;
    }

    const { force = false, points = 10 } = req.body; // Aceptar force y points
    const today = getCurrentDateColombia(); // Fecha actual en Colombia (YYYY-MM-DD)

    // Verificar si ya existe un QR activo para hoy
    const existingQR = await QRCodeModel.findOne({
      dailyDate: today,
      isActive: true,
    });

    // Si existe y NO se está forzando regeneración, retornar el existente
    if (existingQR && !isExpired(existingQR.expiresAt) && !force) {
      // Generar el QR visual del código existente
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/attendance/scan?code=${existingQR.code}`;
      const qrImage = await QRCode.toDataURL(qrUrl, {
        width: 512,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      res.status(200).json({
        success: true,
        message: 'QR activo encontrado',
        data: {
          qrCode: existingQR,
          qrImage,
          qrUrl,
        },
      });
      return;
    }

    // Desactivar TODOS los QRs anteriores (no solo del día actual)
    // Esto asegura que solo haya un QR activo a la vez en toda la base de datos
    await QRCodeModel.updateMany({ isActive: true }, { isActive: false });

    // Crear nuevo QR con puntos configurables
    const code = crypto.randomUUID();
    const expiresAt = createExpirationDate(2); // Expira en 2 horas

    const newQR = new QRCodeModel({
      code,
      generatedBy: adminId,
      // Usamos new Date() directamente en lugar de getCurrentDateTimeColombia()
      // porque MongoDB guarda en UTC y el frontend formatea con timeZone: 'America/Bogota'
      // Esto evita problemas de conversión de zona horaria al enviar al cliente
      generatedAt: new Date(),
      expiresAt,
      isActive: true,
      dailyDate: today,
      usageCount: 0,
      points, // Puntos configurados por el admin
    });

    await newQR.save();

    // Generar imagen del QR
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/attendance/scan?code=${code}`;
    const qrImage = await QRCode.toDataURL(qrUrl, {
      width: 512,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    res.status(201).json({
      success: true,
      message: 'QR generado exitosamente',
      data: {
        qrCode: newQR,
        qrImage,
        qrUrl,
      },
    });
  } catch (error) {
    console.error('Error generando QR:', error);
    ErrorHandler.handleError(error, req, res);
  }
};

// Obtener QR activo del día
export const getCurrentQR = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const today = getCurrentDateColombia();

    const currentQR = await QRCodeModel.findOne({
      dailyDate: today,
      isActive: true,
    }).populate('generatedBy', 'fullName placa');

    if (!currentQR || isExpired(currentQR.expiresAt)) {
      res.status(404).json({
        success: false,
        message: 'No hay QR activo para el día de hoy',
      });
      return;
    }

    // Generar imagen del QR
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/attendance/scan?code=${currentQR.code}`;
    const qrImage = await QRCode.toDataURL(qrUrl, {
      width: 512,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    res.status(200).json({
      success: true,
      message: 'QR activo encontrado',
      data: {
        qrCode: currentQR,
        qrImage,
        qrUrl,
      },
    });
  } catch (error) {
    console.error('Error obteniendo QR actual:', error);
    ErrorHandler.handleError(error, req, res);
  }
};

// Obtener estadísticas del QR actual
export const getQRStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const today = getCurrentDateColombia();

    const currentQR = await QRCodeModel.findOne({
      dailyDate: today,
      isActive: true,
    });

    if (!currentQR) {
      res.status(404).json({
        success: false,
        message: 'No hay QR activo para el día de hoy',
      });
      return;
    }

    // Contar asistencias del día
    const attendanceCount = await AttendanceModel.countDocuments({
      attendanceDate: today,
    });

    res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: {
        qrCode: currentQR,
        attendanceCount,
        isExpired: isExpired(currentQR.expiresAt),
      },
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    ErrorHandler.handleError(error, req, res);
  }
};
