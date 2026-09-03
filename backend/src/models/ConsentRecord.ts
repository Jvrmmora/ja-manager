import mongoose, { Schema, Document } from 'mongoose';

/**
 * Evidencia de consentimiento para el tratamiento de datos personales
 * (Ley 1581 de 2012, art. 9 y Decreto 1377 de 2013, art. 9: deber de conservar
 * prueba de la autorización).
 *
 * La colección es de solo inserción (append-only): nunca se actualiza un
 * registro existente. Cada aceptación genera un documento nuevo.
 */

export type ConsentChannel =
  | 'registration' // aceptado al crear la cuenta
  | 'login_gate' // aceptado por un usuario existente tras iniciar sesión
  | 'reconsent'; // aceptado tras un cambio de versión de la política

export interface IConsentGuardian {
  fullName?: string;
  relationship?: string;
}

export interface IConsentRecord extends Document {
  young_id: mongoose.Types.ObjectId;
  policyVersion: string;
  policyHash?: string;
  documents: string[];
  acceptedAt: Date;
  ip?: string;
  userAgent?: string;
  channel: ConsentChannel;
  /** El titular declaró ser menor de edad al momento de aceptar. */
  isMinor: boolean;
  /** Declaración del representante legal (Opción B: solo declarativo). */
  guardian?: IConsentGuardian;
  createdAt: Date;
  updatedAt: Date;
}

const consentRecordSchema = new Schema<IConsentRecord>(
  {
    young_id: {
      type: Schema.Types.ObjectId,
      ref: 'Young',
      required: true,
      index: true,
    },
    policyVersion: {
      type: String,
      required: true,
      trim: true,
    },
    policyHash: {
      type: String,
      required: false,
      trim: true,
    },
    documents: {
      type: [String],
      default: ['privacy_policy', 'data_processing_authorization'],
    },
    acceptedAt: {
      type: Date,
      required: true,
    },
    ip: {
      type: String,
      required: false,
      trim: true,
    },
    userAgent: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    channel: {
      type: String,
      required: true,
      enum: ['registration', 'login_gate', 'reconsent'],
    },
    isMinor: {
      type: Boolean,
      default: false,
    },
    guardian: {
      fullName: { type: String, trim: true, maxlength: 100 },
      relationship: { type: String, trim: true, maxlength: 60 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

consentRecordSchema.index({ young_id: 1, policyVersion: 1 });
consentRecordSchema.index({ acceptedAt: -1 });

consentRecordSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    ret.id = ret._id?.toString();
    delete ret._id;
    return ret;
  },
});

export default mongoose.model<IConsentRecord>(
  'ConsentRecord',
  consentRecordSchema
);
