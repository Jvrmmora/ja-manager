import mongoose, { Schema, Document } from 'mongoose';

export interface IQRCode extends Document {
  code: string;
  generatedBy: mongoose.Types.ObjectId;
  generatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  dailyDate: string; // "2024-10-05" para control diario
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const qrCodeSchema = new Schema<IQRCode>(
  {
    code: {
      type: String,
      required: [true, 'El código del QR es obligatorio'],
      unique: true,
      trim: true,
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: [true, 'El administrador que generó el QR es obligatorio'],
    },
    generatedAt: {
      type: Date,
      required: [true, 'La fecha de generación es obligatoria'],
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, 'La fecha de expiración es obligatoria'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    dailyDate: {
      type: String,
      required: [true, 'La fecha diaria es obligatoria'],
      index: true,
      // Formato YYYY-MM-DD en zona horaria de Colombia
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índice compuesto para optimizar consultas
qrCodeSchema.index({ dailyDate: 1, isActive: 1 });
qrCodeSchema.index({ code: 1, isActive: 1 });

// Virtual para verificar si está expirado
// Compara timestamps UTC directamente
qrCodeSchema.virtual('isExpired').get(function () {
  const now = new Date();
  return this.expiresAt.getTime() <= now.getTime();
});

// Método para verificar si el QR es válido
qrCodeSchema.methods.isValid = function () {
  return this.isActive && !this.isExpired;
};

export default mongoose.model<IQRCode>('QRCode', qrCodeSchema);
