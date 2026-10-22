import mongoose, { Schema, Document } from 'mongoose';
import { AnswerMap, ContactSnapshot } from '../services/forms/domain/types';
import { RespondentKind } from '../services/forms/domain/rowMapper';

export const SHEETS_SYNC_STATUSES = ['pending', 'synced', 'failed', 'skipped'] as const;
export type SheetsSyncStatus = (typeof SHEETS_SYNC_STATUSES)[number];

export interface IFormResponse {
  formId: mongoose.Types.ObjectId | string;
  respondent: {
    kind: RespondentKind;
    youngId?: mongoose.Types.ObjectId | string | null;
    placa?: string | null;
    /** Datos congelados al responder: el Excel no cambia si el perfil cambia. */
    contact: ContactSnapshot;
  };
  answers: AnswerMap;
  /** Respuesta a la pregunta de asistencia, denormalizada para estadísticas. */
  attending?: boolean | null;
  pointsTransactionId?: mongoose.Types.ObjectId | string | null;
  consentAcceptedAt?: Date | null;
  sheetsSync: {
    status: SheetsSyncStatus;
    attempts: number;
    lastError?: string | null;
  };
  ipHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFormResponseDocument extends IFormResponse, Document {}

const formResponseSchema = new Schema<IFormResponseDocument>(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    respondent: {
      kind: { type: String, enum: ['session', 'placa', 'guest'], required: true },
      youngId: { type: Schema.Types.ObjectId, ref: 'Young', default: null },
      placa: { type: String, default: null },
      contact: { type: Schema.Types.Mixed, default: {} },
    },
    answers: { type: Schema.Types.Mixed, default: {} },
    attending: { type: Boolean, default: null },
    pointsTransactionId: { type: Schema.Types.ObjectId, ref: 'PointsTransaction', default: null },
    consentAcceptedAt: { type: Date, default: null },
    sheetsSync: {
      status: { type: String, enum: SHEETS_SYNC_STATUSES, default: 'skipped' },
      attempts: { type: Number, default: 0 },
      lastError: { type: String, default: null },
    },
    ipHash: { type: String, select: false },
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.ipHash;
        return ret;
      },
    },
  }
);

formResponseSchema.index({ formId: 1, createdAt: -1 });
// Una respuesta por joven y formulario (los invitados no tienen youngId).
// El admin borra respuestas de forma definitiva, así que no hay deletedAt.
formResponseSchema.index(
  { formId: 1, 'respondent.youngId': 1 },
  {
    unique: true,
    partialFilterExpression: { 'respondent.youngId': { $type: 'objectId' } },
  }
);
formResponseSchema.index({ 'sheetsSync.status': 1, 'sheetsSync.attempts': 1 });

export default mongoose.model<IFormResponseDocument>('FormResponse', formResponseSchema);
