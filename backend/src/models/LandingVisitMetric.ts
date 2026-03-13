import mongoose, { Document, Schema } from 'mongoose';

export interface ILandingVisitMetric extends Document {
  year: number;
  visitorHash: string;
  visitorNumber: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  userAgent?: string;
  ipHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const landingVisitMetricSchema = new Schema<ILandingVisitMetric>(
  {
    year: {
      type: Number,
      required: true,
      index: true,
    },
    visitorHash: {
      type: String,
      required: true,
    },
    visitorNumber: {
      type: Number,
      required: true,
      min: 0,
    },
    firstSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Garantiza unicidad anual por visitante anonimo.
landingVisitMetricSchema.index({ year: 1, visitorHash: 1 }, { unique: true });

const LandingVisitMetric =
  mongoose.models.LandingVisitMetric ||
  mongoose.model<ILandingVisitMetric>(
    'LandingVisitMetric',
    landingVisitMetricSchema
  );

export default LandingVisitMetric;
