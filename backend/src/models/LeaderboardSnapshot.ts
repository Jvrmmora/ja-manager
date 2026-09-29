import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaderboardSnapshotRanking {
    youngId: mongoose.Types.ObjectId | string;
    rank: number;
    totalPoints: number;
}

export interface ILeaderboardSnapshot {
    seasonId: mongoose.Types.ObjectId | string;
    weekEndDate: Date; // fin de semana (sábado) que este snapshot representa
    rankings: ILeaderboardSnapshotRanking[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ILeaderboardSnapshotDocument extends Omit<ILeaderboardSnapshot, 'seasonId' | 'rankings'>, Document {
    seasonId: mongoose.Types.ObjectId;
    rankings: (Omit<ILeaderboardSnapshotRanking, 'youngId'> & { youngId: mongoose.Types.ObjectId })[];
}

interface ILeaderboardSnapshotModel extends mongoose.Model<ILeaderboardSnapshotDocument> {
    getLatestBeforeOrAt(seasonId: string, date: Date): Promise<ILeaderboardSnapshotDocument | null>;
}

const leaderboardSnapshotRankingSchema = new Schema(
    {
        youngId: { type: Schema.Types.ObjectId, ref: 'Young', required: true },
        rank: { type: Number, required: true },
        totalPoints: { type: Number, required: true },
    },
    { _id: false }
);

const leaderboardSnapshotSchema = new Schema<ILeaderboardSnapshotDocument, ILeaderboardSnapshotModel>(
    {
        seasonId: { type: Schema.Types.ObjectId, ref: 'Season', required: true, index: true },
        weekEndDate: { type: Date, required: true },
        rankings: { type: [leaderboardSnapshotRankingSchema], required: true, default: [] },
    },
    {
        timestamps: true,
    }
);

leaderboardSnapshotSchema.index({ seasonId: 1, weekEndDate: 1 }, { unique: true });

leaderboardSnapshotSchema.statics.getLatestBeforeOrAt = async function (
    seasonId: string,
    date: Date
) {
    return this.findOne({ seasonId, weekEndDate: { $lte: date } }).sort({ weekEndDate: -1 });
};

const LeaderboardSnapshot = mongoose.model<ILeaderboardSnapshotDocument, ILeaderboardSnapshotModel>(
    'LeaderboardSnapshot',
    leaderboardSnapshotSchema
);

export default LeaderboardSnapshot;
