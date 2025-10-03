import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  youngId: mongoose.Types.ObjectId;
  qrCodeId: mongoose.Types.ObjectId;
  attendanceDate: string; // "2024-10-05"
  scannedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    youngId: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: [true, 'El ID del joven es obligatorio'],
    },
    qrCodeId: {
      type: Schema.Types.ObjectId,
      ref: 'QRCode',
      required: [true, 'El ID del QR es obligatorio'],
    },
    attendanceDate: {
      type: String,
      required: [true, 'La fecha de asistencia es obligatoria'],
      index: true,
    },
    scannedAt: {
      type: Date,
      required: [true, 'La fecha de escaneo es obligatoria'],
      default: Date.now,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimizar consultas
attendanceSchema.index({ youngId: 1, attendanceDate: 1 }, { unique: true }); // Un joven solo puede registrar una vez por día
attendanceSchema.index({ qrCodeId: 1 });
attendanceSchema.index({ attendanceDate: 1 });
attendanceSchema.index({ scannedAt: 1 });

// Índice compuesto para consultas de historial
attendanceSchema.index({ youngId: 1, attendanceDate: -1 });

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);