import mongoose, { Schema, Document } from 'mongoose';

export interface IStreak {
    youngId: mongoose.Types.ObjectId | string;
    seasonId: mongoose.Types.ObjectId | string;
    currentStreakWeeks: number; // racha vigente (semanas)
    bestStreakWeeks: number; // mejor racha histórica de la temporada
    lastAttendanceSaturday?: Date; // sábado (00:00) de la última asistencia que contó para racha
    violetFlameAwarded: boolean; // premio único por temporada
    violetFlameAwardedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStreakDocument extends Omit<IStreak, 'youngId' | 'seasonId'>, Document {
    youngId: mongoose.Types.ObjectId;
    seasonId: mongoose.Types.ObjectId;
}

interface IStreakModel extends mongoose.Model<IStreakDocument> {
    getOrCreate(youngId: string, seasonId: string): Promise<IStreakDocument>;
}

const streakSchema = new Schema<IStreakDocument, IStreakModel>(
    {
        youngId: { type: Schema.Types.ObjectId, ref: 'Young', required: true, index: true },
        seasonId: { type: Schema.Types.ObjectId, ref: 'Season', required: true, index: true },
        currentStreakWeeks: { type: Number, required: true, default: 0 },
        bestStreakWeeks: { type: Number, required: true, default: 0 },
        lastAttendanceSaturday: { type: Date },
        violetFlameAwarded: { type: Boolean, required: true, default: false },
        violetFlameAwardedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

streakSchema.index({ seasonId: 1, youngId: 1 }, { unique: true });

streakSchema.statics.getOrCreate = async function (
    youngId: string,
    seasonId: string
) {
    const existing = await this.findOne({ youngId, seasonId });
    if (existing) return existing;
    return this.create({ youngId, seasonId, currentStreakWeeks: 0, bestStreakWeeks: 0 });
};

const Streak = mongoose.model<IStreakDocument, IStreakModel>('Streak', streakSchema);

export default Streak;


