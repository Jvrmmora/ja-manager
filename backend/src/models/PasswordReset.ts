import mongoose, { Schema, Document } from 'mongoose';

/**
 * Solicitud de restablecimiento de contraseña ("olvidé mi contraseña").
 *
 * Nunca guarda el código ni el token en claro: solo su HMAC. Hay a lo sumo un
 * registro por joven (índice único en `youngId`): pedir un código nuevo
 * reemplaza al anterior.
 *
 * Tiempos:
 *  - `codeExpiresAt`: el código por correo vale 10 minutos.
 *  - `resetTokenExpiresAt`: el token del paso 3 (tras verificar) vale 10 minutos.
 *  - `expiresAt`: TTL de Mongo (borra el documento). Se mantiene 1 hora desde el
 *    último envío a propósito: así el tope "3 códigos por hora" sigue contando
 *    aunque el código ya haya vencido.
 */
export interface IPasswordReset extends Document {
  youngId: mongoose.Types.ObjectId;
  codeHash: string;
  attempts: number; // intentos fallidos de verificar el código
  sentCount: number; // códigos enviados dentro de la ventana de 1 hora
  windowStartedAt: Date; // inicio de la ventana del tope por hora
  lastSentAt: Date; // para el enfriamiento de 60 s entre envíos
  codeExpiresAt: Date;
  resetTokenHash?: string; // se crea al verificar el código; de un solo uso
  resetTokenExpiresAt?: Date;
  verifiedAt?: Date;
  requestIp?: string;
  expiresAt: Date; // TTL del documento
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetSchema = new Schema<IPasswordReset>(
  {
    youngId: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: true,
      unique: true,
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sentCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    codeExpiresAt: { type: Date, required: true },
    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date },
    verifiedAt: { type: Date },
    requestIp: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false }
);

// TTL: Mongo elimina el documento cuando llega expiresAt.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Búsqueda del token del paso 3.
passwordResetSchema.index({ resetTokenHash: 1 }, { sparse: true });

export default mongoose.model<IPasswordReset>(
  'PasswordReset',
  passwordResetSchema
);
