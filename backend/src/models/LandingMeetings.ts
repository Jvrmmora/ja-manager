import mongoose, { Schema, Document } from 'mongoose';

export interface ILandingMeeting extends Document {
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string;
  schedule: {
    day: string; // e.g., "Viernes" or "Sábados"
    time: string; // e.g., "7:30 p. m."
  };
  modality: 'virtual' | 'presencial' | 'híbrido';
  meetingLink?: string; // Zoom, Google Meet URL, etc.
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const landingMeetingsSchema = new Schema<ILandingMeeting>(
  {
    title: {
      type: String,
      required: [true, 'Título de reunión es requerido'],
      trim: true,
      maxlength: [100, 'El título no puede exceder 100 caracteres'],
    },
    subtitle: {
      type: String,
      required: [true, 'Subtítulo es requerido'],
      trim: true,
      maxlength: [150, 'El subtítulo no puede exceder 150 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'Descripción es requerida'],
      maxlength: [1000, 'La descripción no puede exceder 1000 caracteres'],
    },
    imageUrl: {
      type: String,
      default: null,
      validate: {
        validator: function (url: string) {
          if (!url) return true;
          return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url);
        },
        message: 'URL de imagen no válida',
      },
    },
    schedule: {
      day: {
        type: String,
        required: [true, 'Día es requerido'],
        trim: true,
      },
      time: {
        type: String,
        required: [true, 'Hora es requerida'],
        trim: true,
      },
    },
    modality: {
      type: String,
      enum: {
        values: ['virtual', 'presencial', 'híbrido'],
        message: 'Modalidad no válida. Debe ser virtual, presencial o híbrido.',
      },
      required: [true, 'Modalidad es requerida'],
    },
    meetingLink: {
      type: String,
      default: null,
      validate: {
        validator: function (url: string) {
          if (!url) return true;
          return /^https?:\/\/.+/.test(url);
        },
        message: 'URL no válida',
      },
    },
    order: {
      type: Number,
      required: [true, 'Orden es requerido'],
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'landing_meetings',
  }
);

// Índice para ordenamiento
landingMeetingsSchema.index({ order: 1 });

export default mongoose.model<ILandingMeeting>(
  'LandingMeeting',
  landingMeetingsSchema
);
