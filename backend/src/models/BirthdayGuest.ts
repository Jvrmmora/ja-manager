import mongoose, { Schema, Document } from 'mongoose';

/**
 * Invitado agregado a mano al reporte de cumpleaños (quien no llenó el
 * formulario o no quedó registrado). Solo guarda lo necesario para el reporte:
 * nombre y día/mes del cumpleaños.
 *
 * `formId` opcional: con formulario, aparece solo en el reporte de ese
 * formulario; sin formulario, aparece en todos los reportes del semestre.
 */
export interface IBirthdayGuest {
  fullName: string;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  formId?: mongoose.Types.ObjectId | string | null;
  createdBy?: mongoose.Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBirthdayGuestDocument extends IBirthdayGuest, Document {}

const birthdayGuestSchema = new Schema<IBirthdayGuestDocument>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    month: { type: Number, required: true, min: 1, max: 12 },
    day: { type: Number, required: true, min: 1, max: 31 },
    formId: { type: Schema.Types.ObjectId, ref: 'Form', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Young', default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

birthdayGuestSchema.index({ formId: 1 });

export default mongoose.model<IBirthdayGuestDocument>('BirthdayGuest', birthdayGuestSchema);
