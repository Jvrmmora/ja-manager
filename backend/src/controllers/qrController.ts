import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import QRCodeModel from '../models/QRCode';
import AttendanceModel from '../models/Attendance';
import { ApiResponse } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

// Generar QR del día (solo administradores)
export const generateDailyQR = async (req: Request, res: Response): Promise<void> => {
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

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Verificar si ya existe un QR activo para hoy
    const existingQR = await QRCodeModel.findOne({
      dailyDate: today,
      isActive: true,
    });

    if (existingQR && existingQR.expiresAt > new Date()) {
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

    // Desactivar QRs anteriores del día
    await QRCodeModel.updateMany(
      { dailyDate: today },
      { isActive: false }
    );

    // Crear nuevo QR
    const code = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // Expira en 2 horas

    const newQR = new QRCodeModel({
      code,
      generatedBy: adminId,
      generatedAt: new Date(),
      expiresAt,
      isActive: true,
      dailyDate: today,
      usageCount: 0,
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
export const getCurrentQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const currentQR = await QRCodeModel.findOne({
      dailyDate: today,
      isActive: true,
    }).populate('generatedBy', 'fullName placa');

    if (!currentQR || currentQR.expiresAt <= new Date()) {
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
export const getQRStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date().toISOString().split('T')[0];

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
        isExpired: currentQR.expiresAt <= new Date(),
      },
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    ErrorHandler.handleError(error, req, res);
  }
};