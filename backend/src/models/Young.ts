import mongoose, { Schema, Document } from 'mongoose';
import { IYoung } from '../types';

interface IYoungDocument extends Omit<IYoung, 'id' | '_id'>, Document {}

const youngSchema = new Schema<IYoungDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    ageRange: {
      type: String,
      required: [true, 'El rango de edad es obligatorio'],
      enum: {
        values: ['13-15', '16-18', '19-21', '22-25', '26-30', '30+'],
        message: 'Rango de edad no válido',
      },
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
      match: [
        /^[\+]?[\d\s\-\(\)]{8,15}$/,
        'Formato de teléfono no válido',
      ],
    },
    birthday: {
      type: Date,
      required: [true, 'La fecha de cumpleaños es obligatoria'],
      validate: {
        validator: function (date: Date) {
          const today = new Date();
          const minAge = new Date();
          minAge.setFullYear(today.getFullYear() - 50);
          const maxAge = new Date();
          maxAge.setFullYear(today.getFullYear() - 10);
          return date >= minAge && date <= maxAge;
        },
        message: 'La fecha de cumpleaños debe estar entre 10 y 50 años atrás',
      },
    },
    profileImage: {
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
    gender: {
      type: String,
      required: [true, 'El género es obligatorio'],
      enum: {
        values: ['masculino', 'femenino'],
        message: 'El género debe ser masculino o femenino',
      },
    },
    role: {
      type: String,
      required: [true, 'El rol es obligatorio'],
      enum: {
        values: [
          'lider juvenil',
          'colaborador', 
          'director',
          'subdirector',
          'club guias',
          'club conquistadores',
          'club aventureros',
          'escuela sabatica'
        ],
        message: 'Rol no válido',
      },
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Formato de email no válido',
      ],
    },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: function (skills: string[]) {
          return skills.every(skill => skill.trim().length >= 2);
        },
        message: 'Cada habilidad debe tener al menos 2 caracteres',
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices para mejorar el rendimiento
youngSchema.index({ fullName: 'text' });
youngSchema.index({ ageRange: 1 });
youngSchema.index({ birthday: 1 });
youngSchema.index({ createdAt: -1 });

// Método para obtener la edad actual
youngSchema.methods.getCurrentAge = function(): number {
  const today = new Date();
  const birthDate = new Date(this.birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Método para verificar si es cumpleaños hoy
youngSchema.methods.isBirthdayToday = function(): boolean {
  const today = new Date();
  const birthDate = new Date(this.birthday);
  return (
    today.getMonth() === birthDate.getMonth() &&
    today.getDate() === birthDate.getDate()
  );
};

export default mongoose.model<IYoungDocument>('Young', youngSchema);
