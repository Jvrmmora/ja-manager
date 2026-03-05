import mongoose, { Schema, Document } from 'mongoose';

export interface IQRCode extends Document {
  code: string;
  generatedBy: mongoose.Types.ObjectId;
  generatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  dailyDate: string; // "2024-10-05" para control diario
  usageCount: number;
  points: number; // Puntos que otorga este QR (configurable por admin)
  speedBonusEnabled?: boolean; // Si está habilitado el bonus por velocidad
  bonusDecayMinutes?: number; // Duración del bonus en minutos (default: 30)
  createdAt?: Date;
  updatedAt?: Date;
  getCurrentSpeedBonus(): number; // Método para calcular bonus actual
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
    points: {
      type: Number,
      default: 10,
      min: [10, 'Los puntos deben ser al menos 10'],
      max: [100, 'Los puntos no pueden exceder 100'],
    },
    speedBonusEnabled: {
      type: Boolean,
      default: true,
    },
    bonusDecayMinutes: {
      type: Number,
      default: 30,
      min: [5, 'La duración del bonus debe ser al menos 5 minutos'],
      max: [30, 'La duración del bonus no puede exceder 30 minutos'],
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

// Método para calcular el bonus actual por velocidad
qrCodeSchema.methods.getCurrentSpeedBonus = function (): number {
  if (!this.speedBonusEnabled) {
    return 0;
  }

  const now = new Date();
  const elapsedMs = now.getTime() - this.generatedAt.getTime();
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const decayMinutes = this.bonusDecayMinutes || 30;

  // Si ya pasó el tiempo de decaimiento, no hay bonus
  if (elapsedMinutes >= decayMinutes) {
    return 0;
  }

  // Calcular bonus máximo (50% de los puntos base)
  const maxBonus = this.points * 0.5;

  // Decaimiento lineal: bonus = maxBonus × (1 - elapsed/decay)
  const bonus = maxBonus * (1 - elapsedMinutes / decayMinutes);

  // Redondear hacia arriba
  return Math.ceil(Math.max(0, bonus));
};

export default mongoose.model<IQRCode>('QRCode', qrCodeSchema);
