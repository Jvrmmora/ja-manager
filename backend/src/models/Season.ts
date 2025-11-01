import mongoose, { Schema, Document } from 'mongoose';

export interface ISeason {
  id?: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  prizes?: {
    first?: string;
    second?: string;
    third?: string;
  };
  settings: {
    attendancePoints: number;
    referralBonusPoints: number;
    referralWelcomePoints: number;
    streakMinDays: number;
    streakLostAfterDays: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISeasonDocument extends Omit<ISeason, 'id'>, Document {
  isInProgress(): boolean;
  activate(): Promise<void>;
  complete(): Promise<void>;
}

interface ISeasonModel extends mongoose.Model<ISeasonDocument> {
  getActiveSeason(): Promise<ISeasonDocument | null>;
}

const seasonSchema = new Schema<ISeasonDocument, ISeasonModel>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la temporada es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    startDate: {
      type: Date,
      required: [true, 'La fecha de inicio es obligatoria'],
    },
    endDate: {
      type: Date,
      required: [true, 'La fecha de fin es obligatoria'],
      validate: {
        validator: function (this: ISeasonDocument, value: Date) {
          return value > this.startDate;
        },
        message: 'La fecha de fin debe ser posterior a la fecha de inicio',
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['UPCOMING', 'ACTIVE', 'COMPLETED'],
        message: 'Estado no válido',
      },
      default: 'UPCOMING',
    },
    prizes: {
      first: {
        type: String,
        trim: true,
      },
      second: {
        type: String,
        trim: true,
      },
      third: {
        type: String,
        trim: true,
      },
    },
    settings: {
      attendancePoints: {
        type: Number,
        required: true,
        default: 10,
        min: [1, 'Los puntos de asistencia deben ser al menos 1'],
      },
      referralBonusPoints: {
        type: Number,
        required: true,
        default: 30,
        min: [1, 'Los puntos de bonus de referido deben ser al menos 1'],
      },
      referralWelcomePoints: {
        type: Number,
        required: true,
        default: 10,
        min: [1, 'Los puntos de bienvenida deben ser al menos 1'],
      },
      streakMinDays: {
        type: Number,
        required: true,
        default: 3,
        min: [1, 'Los días mínimos de racha deben ser al menos 1'],
      },
      streakLostAfterDays: {
        type: Number,
        required: true,
        default: 2,
        min: [1, 'Los días para perder racha deben ser al menos 1'],
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret._id.toString();
        ret.isActive = ret.status === 'ACTIVE';
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

// Índices para optimizar consultas
seasonSchema.index({ status: 1 });
seasonSchema.index({ startDate: 1, endDate: 1 });

// Validación: Solo puede haber una temporada ACTIVE a la vez
seasonSchema.pre('save', async function (next) {
  if (this.status === 'ACTIVE' && !this.isNew) {
    const Season = mongoose.model<ISeasonDocument>('Season');
    const activeSeason = await Season.findOne({
      status: 'ACTIVE',
      _id: { $ne: this._id },
    });

    if (activeSeason) {
      throw new Error(
        'Ya existe una temporada activa. Por favor, finaliza la temporada actual antes de activar una nueva.'
      );
    }
  }
  next();
});

// Método estático para obtener la temporada activa
seasonSchema.statics.getActiveSeason = async function () {
  return this.findOne({ status: 'ACTIVE' });
};

// Método para verificar si la temporada está en curso
seasonSchema.methods.isInProgress = function () {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
};

// Método para activar la temporada
seasonSchema.methods.activate = async function () {
  const Season = mongoose.model<ISeasonDocument>('Season');

  // Desactivar cualquier otra temporada activa
  await Season.updateMany(
    { status: 'ACTIVE', _id: { $ne: this._id } },
    { status: 'COMPLETED' }
  );

  this.status = 'ACTIVE';
  await this.save();
};

// Método para finalizar la temporada
seasonSchema.methods.complete = async function () {
  this.status = 'COMPLETED';
  await this.save();
};

const Season = mongoose.model<ISeasonDocument, ISeasonModel>(
  'Season',
  seasonSchema
);

export default Season;
