import mongoose, { Schema, Document } from 'mongoose';

/** Cifras de la temporada para el resumen de la premiación */
export interface ISeasonPersonStats {
  attendanceCount: number;
  attendancePercent: number;
  bestStreakWeeks: number;
  totalPoints: number;
  points: {
    attendance: number;
    activity: number;
    referrals: number;
    forms: number;
    birthday: number;
    bonus: number;
  };
  referrals: number;
  activities: number;
  forms: number;
  earlyArrivals: number;
  earlyPoints: number;
  streakBonus: boolean; // premio por 4 sábados consecutivos
}

export interface ISeasonPodiumEntry {
  place: number;
  youngId: mongoose.Types.ObjectId | string;
  name: string;
  profileImage?: string;
  totalPoints: number;
  streak: number;
  stats?: ISeasonPersonStats;
}

export interface ISeasonConstancyWinner {
  youngId: mongoose.Types.ObjectId | string;
  name: string;
  profileImage?: string;
  bestStreakWeeks: number;
  attendanceCount: number;
  stats?: ISeasonPersonStats;
}

/**
 * Foto del cierre de una temporada. Guarda nombre y foto del momento para que
 * el histórico no cambie si el joven edita su perfil o se elimina.
 */
export interface ISeasonResults {
  finalizedAt: Date;
  finalizedBy?: mongoose.Types.ObjectId | string;
  totalParticipants: number;
  totalDays?: number; // días con asistencia registrada en la temporada
  podium: ISeasonPodiumEntry[];
  constancy: {
    bestStreakWeeks: number;
    winners: ISeasonConstancyWinner[];
  };
}

export interface ISeason {
  id?: string;
  name: string;
  description?: string;
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
    birthdayBonusPoints: number;
  };
  results?: ISeasonResults;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISeasonDocument extends Omit<ISeason, 'id'>, Document {
  isInProgress(): boolean;
  activate(): Promise<void>;
}

interface ISeasonModel extends mongoose.Model<ISeasonDocument> {
  getActiveSeason(): Promise<ISeasonDocument | null>;
}

const num = { type: Number, default: 0 };
const personStatsSchema = new Schema(
  {
    attendanceCount: num,
    attendancePercent: num,
    bestStreakWeeks: num,
    totalPoints: num,
    points: {
      attendance: num,
      activity: num,
      referrals: num,
      forms: num,
      birthday: num,
      bonus: num,
    },
    referrals: num,
    activities: num,
    forms: num,
    earlyArrivals: num,
    earlyPoints: num,
    streakBonus: { type: Boolean, default: false },
  },
  { _id: false }
);

const podiumEntrySchema = new Schema(
  {
    place: { type: Number, required: true, min: 1, max: 3 },
    youngId: { type: Schema.Types.ObjectId, ref: 'Young', required: true },
    name: { type: String, required: true },
    profileImage: { type: String },
    totalPoints: { type: Number, required: true },
    streak: { type: Number, required: true, default: 0 },
    stats: { type: personStatsSchema },
  },
  { _id: false }
);

const constancyWinnerSchema = new Schema(
  {
    youngId: { type: Schema.Types.ObjectId, ref: 'Young', required: true },
    name: { type: String, required: true },
    profileImage: { type: String },
    bestStreakWeeks: { type: Number, required: true },
    attendanceCount: { type: Number, required: true, default: 0 },
    stats: { type: personStatsSchema },
  },
  { _id: false }
);

const seasonResultsSchema = new Schema(
  {
    finalizedAt: { type: Date, required: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'Young' },
    totalParticipants: { type: Number, required: true, default: 0 },
    totalDays: { type: Number, default: 0 },
    podium: { type: [podiumEntrySchema], default: [] },
    constancy: {
      bestStreakWeeks: { type: Number, required: true, default: 0 },
      winners: { type: [constancyWinnerSchema], default: [] },
    },
  },
  { _id: false }
);

const seasonSchema = new Schema<ISeasonDocument, ISeasonModel>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la temporada es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
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
      birthdayBonusPoints: {
        type: Number,
        required: true,
        default: 100,
        min: [1, 'Los puntos de cumpleaños deben ser al menos 1'],
      },
    },
    // Oculto por defecto: los GET de temporadas son públicos y esto lleva
    // nombres y fotos. Se pide explícitamente con select('+results').
    results: { type: seasonResultsSchema, select: false },
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

// Método para activar la temporada. La temporada que estuviera activa debe
// finalizarse antes con seasonResultsService para congelar su resultado.
seasonSchema.methods.activate = async function () {
  this.status = 'ACTIVE';
  await this.save();
};

const Season = mongoose.model<ISeasonDocument, ISeasonModel>(
  'Season',
  seasonSchema
);

export default Season;
