import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
  fullName: string;
  email: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      trim: true,
      lowercase: true,
      maxlength: [120, 'El correo no puede exceder 120 caracteres'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Formato de correo no valido'],
    },
    message: {
      type: String,
      required: [true, 'El mensaje es obligatorio'],
      trim: true,
      minlength: [10, 'El mensaje debe tener al menos 10 caracteres'],
      maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres'],
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: [100, 'IP demasiado larga'],
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent demasiado largo'],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ email: 1 });

export default mongoose.model<IContactMessage>(
  'ContactMessage',
  contactMessageSchema
);
