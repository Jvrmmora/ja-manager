import mongoose, { Schema, Document } from 'mongoose';

// La descripción puede llegar como HTML enriquecido (editor TipTap del CMS).
// Se valida por longitud de texto visible, no de markup, y se acota el tamaño
// crudo para evitar payloads desproporcionados.
const MAX_PLAIN_TEXT = 700;
const MAX_RAW_LENGTH = 20000;

const getPlainTextLength = (value?: string) => {
  if (!value) return 0;

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim().length;
};

export interface ILandingMedia extends Document {
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'document';
  category: 'hero' | 'gallery' | 'testimonial' | 'event' | 'resource' | 'other';
  altText?: string;
  order: number;
  isPublished: boolean;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number; // For videos, in seconds
    fileSize?: number; // In bytes
  };
  createdAt: Date;
  updatedAt: Date;
}

const landingMediaSchema = new Schema<ILandingMedia>(
  {
    title: {
      type: String,
      required: [true, 'Título de media es requerido'],
      trim: true,
      maxlength: [100, 'El título no puede exceder 100 caracteres'],
    },
    description: {
      type: String,
      trim: true,
      validate: [
        {
          validator: (value?: string) => !value || value.length <= MAX_RAW_LENGTH,
          message: 'La descripción es demasiado extensa',
        },
        {
          validator: (value?: string) =>
            !value || getPlainTextLength(value) <= MAX_PLAIN_TEXT,
          message: `La descripción no puede exceder ${MAX_PLAIN_TEXT} caracteres`,
        },
      ],
    },
    mediaUrl: {
      type: String,
      required: [true, 'URL de media es requerida'],
      validate: {
        validator: function (url: string) {
          return /^https?:\/\/.+/.test(url);
        },
        message: 'URL no es válida',
      },
    },
    mediaType: {
      type: String,
      enum: {
        values: ['image', 'video', 'document'],
        message: 'Tipo de media debe ser image, video o document',
      },
      required: [true, 'Tipo de media es requerido'],
    },
    category: {
      type: String,
      enum: {
        values: [
          'hero',
          'gallery',
          'testimonial',
          'event',
          'resource',
          'other',
        ],
        message: 'Categoría no válida',
      },
      required: [true, 'Categoría es requerida'],
      default: 'gallery',
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [200, 'Alt text no puede exceder 200 caracteres'],
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
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      fileSize: Number,
    },
  },
  {
    timestamps: true,
    collection: 'landing_media',
  }
);

// Índices
landingMediaSchema.index({ category: 1, isPublished: 1, order: 1 });
landingMediaSchema.index({ order: 1 });

export default mongoose.model<ILandingMedia>(
  'LandingMedia',
  landingMediaSchema
);
