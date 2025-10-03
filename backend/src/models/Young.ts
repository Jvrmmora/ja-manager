import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IYoung } from '../types';

interface IYoungDocument extends Omit<IYoung, 'id' | '_id'>, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generatePlaca(): string;
}

const youngSchema = new Schema<IYoungDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres'],
    },
    // Nueva placa única
    placa: {
      type: String,
      unique: true,
      sparse: true, // Permite que algunos documentos no tengan placa
      trim: true,
      match: [
        /^@MOD[A-Z]{2,4}\d{3}$/,
        'Formato de placa no válido. Debe ser @MODxx###, @MODxxx### o @MODxxxx### (ej: @MODJAVI001)',
      ],
    },
    // Nueva contraseña encriptada
    password: {
      type: String,
      required: false,
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    },
    // Nuevo ID del rol
    role_id: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
    },
    // Nuevo nombre del rol
    role_name: {
      type: String,
      required: false,
      trim: true,
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
      required:false,
      trim: true,
      match: [
        /^[\+]?[\d\s\-\(\)]{8,15}$/,
        'Formato de teléfono no válido',
      ],
    },
    birthday: {
      type: Date,
      required: false,
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
          'escuela sabatica'
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
    unique: true,
    sparse: true, // Permite múltiples valores null pero emails únicos
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Por favor ingrese un email válido'
    ]
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
    // Grupo para clasificación interna (1..5)
    group: {
      type: Number,
      required: false,
      min: [1, 'El grupo debe ser entre 1 y 5'],
      max: [5, 'El grupo debe ser entre 1 y 5'],
    },
    // Campo para controlar primer login
    first_login: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Middleware para encriptar la contraseña antes de guardar
youngSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  next();
});

// Middleware para generar placa automáticamente si no existe
youngSchema.pre('save', async function(next) {
  if (!this.placa && this.role_name === 'Super Admin') {
    this.placa = this.generatePlaca();
  }
  next();
});

// Índices para mejorar el rendimiento
youngSchema.index({ fullName: 'text' });
youngSchema.index({ ageRange: 1 });
youngSchema.index({ birthday: 1 });
youngSchema.index({ createdAt: -1 });
youngSchema.index({ role_id: 1 });
// Nota: placa y email ya tienen índices automáticos por unique: true

// Método para comparar contraseñas
youngSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para generar placa única
youngSchema.methods.generatePlaca = function(): string {
  const nameWords = this.fullName.trim().split(' ');
  const firstName = nameWords[0];
  let initials = '';
  
  // Tomar un máximo de 4 letras del primer nombre
  if (firstName.length >= 4) {
    initials = firstName.substring(0, 4).toUpperCase();
  } else if (firstName.length >= 2) {
    initials = firstName.toUpperCase();
    
    // Si tenemos segundo nombre y no llegamos a 4 letras, completar con el segundo
    if (nameWords.length > 1 && initials.length < 4) {
      const secondName = nameWords[1];
      const remainingLength = Math.min(4 - initials.length, secondName.length);
      initials += secondName.substring(0, remainingLength).toUpperCase();
    }
  } else {
    // Nombre muy corto, usar mínimo 2 caracteres
    initials = firstName.toUpperCase().padEnd(2, 'X');
  }
  
  // Por ahora usar 001, luego implementaremos el consecutivo
  const consecutive = '001';
  
  return `@MOD${initials}${consecutive}`;
};

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
