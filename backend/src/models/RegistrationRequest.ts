import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IRegistrationRequest extends Document {
  fullName: string;
  ageRange: string;
  phone?: string;
  birthday: Date;
  gender?: 'masculino' | 'femenino' | '';
  role: string;
  email?: string;
  skills: string[];
  profileImage?: string;
  group?: number;
  password: string; // Contraseña elegida por el usuario
  referredBy?: mongoose.Types.ObjectId; // ID del joven que lo refirió
  referredByPlaca?: string; // Placa del referido (para búsqueda fácil)
  placa?: string; // Placa asignada al crear la solicitud
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId; // ID del admin que revisó
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const registrationRequestSchema = new Schema<IRegistrationRequest>(
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
      required: false,
      trim: true,
      match: [/^[\+]?[\d\s\-\(\)]{8,15}$/, 'Formato de teléfono no válido'],
    },
    birthday: {
      type: Date,
      required: [true, 'La fecha de cumpleaños es obligatoria'],
    },
    gender: {
      type: String,
      required: false,
      enum: {
        values: ['masculino', 'femenino', ''],
        message: 'El género debe ser masculino, femenino o no especificado',
      },
    },
    role: {
      type: String,
      required: [true, 'El rol es obligatorio'],
      enum: {
        values: [
          'lider juvenil',
          'simpatizante',
          'colaborador',
          'joven adventista',
          'director',
          'subdirector',
          'club guias',
          'club conquistadores',
          'club aventureros',
          'escuela sabatica',
        ],
        message: 'Rol no válido',
      },
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: function(email: string | null | undefined) {
          if (!email || email.trim() === '') return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Por favor ingrese un email válido',
      },
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
    group: {
      type: Number,
      required: false,
      min: [1, 'El grupo debe ser entre 1 y 5'],
      max: [5, 'El grupo debe ser entre 1 y 5'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: false,
      default: null,
    },
    referredByPlaca: {
      type: String,
      required: false,
      trim: true,
    },
    placa: {
      type: String,
      required: false,
      trim: true,
      match: [
        /^@MOD[A-Z]{2,4}\d{3}$/,
        'Formato de placa no válido. Debe ser @MODxx###, @MODxxx### o @MODxxxx### (ej: @MODJAVI001)',
      ],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: false,
    },
    reviewedAt: {
      type: Date,
      required: false,
    },
    rejectionReason: {
      type: String,
      required: false,
      trim: true,
      maxlength: [500, 'La razón de rechazo no puede exceder 500 caracteres'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Middleware para encriptar la contraseña antes de guardar
registrationRequestSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  next();
});

// Índices para mejorar consultas
registrationRequestSchema.index({ status: 1 });
registrationRequestSchema.index({ createdAt: -1 });
registrationRequestSchema.index({ email: 1 });
registrationRequestSchema.index({ referredBy: 1 });

export default mongoose.model<IRegistrationRequest>(
  'RegistrationRequest',
  registrationRequestSchema
);

