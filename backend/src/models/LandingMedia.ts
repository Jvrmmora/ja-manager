import mongoose, { Schema, Document } from 'mongoose';

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
      maxlength: [500, 'La descripción no puede exceder 500 caracteres'],
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
