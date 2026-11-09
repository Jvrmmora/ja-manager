import mongoose, { Schema, Document } from 'mongoose';

export interface IYoungDuplicateDismissal extends Document {
  pairKey: string;
  youngIds: mongoose.Types.ObjectId[];
  dismissedBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
}

/** Par que un admin revisó y marcó como "no son la misma persona". */
const youngDuplicateDismissalSchema = new Schema<IYoungDuplicateDismissal>(
  {
    pairKey: { type: String, required: true, unique: true },
    youngIds: [{ type: Schema.Types.ObjectId, ref: 'Young', required: true }],
    dismissedBy: { type: Schema.Types.ObjectId, ref: 'Young' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

export default mongoose.model<IYoungDuplicateDismissal>(
  'YoungDuplicateDismissal',
  youngDuplicateDismissalSchema
);
