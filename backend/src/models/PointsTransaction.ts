import mongoose, { Schema, Document } from 'mongoose';

export type PointsTransactionType =
  | 'ATTENDANCE'
  | 'ACTIVITY'
  | 'REFERRAL_BONUS'
  | 'REFERRAL_WELCOME';

export interface IPointsTransaction {
  id?: string;
  youngId: mongoose.Types.ObjectId | string;
  seasonId: mongoose.Types.ObjectId | string;
  points: number;
  type: PointsTransactionType;
  activityCategoryId?: mongoose.Types.ObjectId | string;
  description?: string;
  eventId?: mongoose.Types.ObjectId | string;
  referredYoungId?: mongoose.Types.ObjectId | string;
  assignedBy?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
}

export interface IPointsTransactionDocument
  extends Omit<IPointsTransaction, 'id'>,
    Document {}

interface IPointsTransactionModel
  extends mongoose.Model<IPointsTransactionDocument> {
  calculateTotalPoints(youngId: string, seasonId: string): Promise<number>;
  getTransactionsByType(
    youngId: string,
    seasonId: string,
    type: PointsTransactionType
  ): Promise<IPointsTransactionDocument[]>;
  countByType(
    youngId: string,
    seasonId: string,
    type: PointsTransactionType
  ): Promise<number>;
  getYoungHistory(
    youngId: string,
    seasonId?: string,
    limit?: number,
    skip?: number
  ): Promise<IPointsTransactionDocument[]>;
}

const pointsTransactionSchema = new Schema<
  IPointsTransactionDocument,
  IPointsTransactionModel
>(
  {
    youngId: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: [true, 'El ID del joven es obligatorio'],
      index: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: 'Season',
      required: [true, 'El ID de la temporada es obligatorio'],
      index: true,
    },
    points: {
      type: Number,
      required: [true, 'Los puntos son obligatorios'],
      validate: {
        validator: function (value: number) {
          return value !== 0;
        },
        message: 'Los puntos no pueden ser 0',
      },
    },
    type: {
      type: String,
      required: [true, 'El tipo de transacción es obligatorio'],
      enum: {
        values: [
          'ATTENDANCE',
          'ACTIVITY',
          'REFERRAL_BONUS',
          'REFERRAL_WELCOME',
        ],
        message: 'Tipo de transacción no válido',
      },
      index: true,
    },
    activityCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ActivityCategory',
      required: function (this: IPointsTransactionDocument) {
        return this.type === 'ACTIVITY';
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'QRCode',
      required: function (this: IPointsTransactionDocument) {
        return this.type === 'ATTENDANCE';
      },
    },
    referredYoungId: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: function (this: IPointsTransactionDocument) {
        return (
          this.type === 'REFERRAL_BONUS' || this.type === 'REFERRAL_WELCOME'
        );
      },
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: function (this: IPointsTransactionDocument) {
        return this.type === 'ACTIVITY';
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índices compuestos para optimizar consultas comunes
pointsTransactionSchema.index({ youngId: 1, seasonId: 1 });
pointsTransactionSchema.index({ seasonId: 1, createdAt: -1 });
pointsTransactionSchema.index({ youngId: 1, seasonId: 1, type: 1 });

// Método estático para calcular puntos totales de un joven en una temporada
pointsTransactionSchema.statics.calculateTotalPoints = async function (
  youngId: string,
  seasonId: string
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        youngId: new mongoose.Types.ObjectId(youngId),
        seasonId: new mongoose.Types.ObjectId(seasonId),
      },
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: '$points' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalPoints : 0;
};

// Método estático para obtener transacciones por tipo
pointsTransactionSchema.statics.getTransactionsByType = async function (
  youngId: string,
  seasonId: string,
  type: PointsTransactionType
) {
  return this.find({
    youngId: new mongoose.Types.ObjectId(youngId),
    seasonId: new mongoose.Types.ObjectId(seasonId),
    type,
  })
    .sort({ createdAt: -1 })
    .populate('activityCategoryId', 'name icon')
    .populate('assignedBy', 'fullName')
    .populate('referredYoungId', 'fullName');
};

// Método estático para contar transacciones por tipo
pointsTransactionSchema.statics.countByType = async function (
  youngId: string,
  seasonId: string,
  type: PointsTransactionType
): Promise<number> {
  return this.countDocuments({
    youngId: new mongoose.Types.ObjectId(youngId),
    seasonId: new mongoose.Types.ObjectId(seasonId),
    type,
  });
};

// Método estático para obtener el historial completo de un joven
pointsTransactionSchema.statics.getYoungHistory = async function (
  youngId: string,
  seasonId?: string,
  limit = 50,
  skip = 0
) {
  const query: any = { youngId: new mongoose.Types.ObjectId(youngId) };

  if (seasonId) {
    query.seasonId = new mongoose.Types.ObjectId(seasonId);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('seasonId', 'name')
    .populate('activityCategoryId', 'name icon')
    .populate('assignedBy', 'fullName')
    .populate('referredYoungId', 'fullName');
};

const PointsTransaction = mongoose.model<
  IPointsTransactionDocument,
  IPointsTransactionModel
>('PointsTransaction', pointsTransactionSchema);

export default PointsTransaction;
