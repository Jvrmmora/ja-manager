import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description: string;
  scopes: string[];
  created_at: Date;
  updated_at?: Date | null;
  deleted_at?: Date | null;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del rol es obligatorio'],
      trim: true,
      unique: true,
      maxlength: [50, 'El nombre no puede exceder 50 caracteres'],
    },
    description: {
      type: String,
      required: [true, 'La descripción del rol es obligatoria'],
      trim: true,
      maxlength: [200, 'La descripción no puede exceder 200 caracteres'],
    },
    scopes: {
      type: [String],
      required: [true, 'Los scopes son obligatorios'],
      validate: {
        validator: function (scopes: string[]) {
          return scopes.length > 0;
        },
        message: 'Debe tener al menos un scope',
      },
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: null,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  }
);

// Índices
roleSchema.index({ name: 1 });
roleSchema.index({ deleted_at: 1 });

export default mongoose.model<IRole>('Role', roleSchema);
