import mongoose, { Document, Schema } from 'mongoose';

export interface ILandingVisitSummary extends Document {
  year: number;
  uniqueVisitorsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const landingVisitSummarySchema = new Schema<ILandingVisitSummary>(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    uniqueVisitorsCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const LandingVisitSummary =
  mongoose.models.LandingVisitSummary ||
  mongoose.model<ILandingVisitSummary>(
    'LandingVisitSummary',
    landingVisitSummarySchema
  );

export default LandingVisitSummary;
