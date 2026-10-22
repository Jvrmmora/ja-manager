import mongoose, { Schema, Document } from 'mongoose';
import {
  CONDITION_OPS,
  CONTACT_FIELDS,
  CONTACT_FIELD_MODES,
  ContactFieldConfig,
  FormSection,
  QUESTION_TYPES,
} from '../services/forms/domain/types';

export const FORM_STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export interface IFormEvent {
  startsAt?: Date | null;
  endsAt?: Date | null;
  location?: string;
  mapsUrl?: string;
  cost?: number | null;
  costNote?: string;
}

export interface IFormSettings {
  allowGuests: boolean;
  pointsReward: number;
  showRegisterCta: boolean;
}

export interface IFormSheets {
  enabled: boolean;
  spreadsheetId?: string | null;
  sheetName: string;
  lastSyncAt?: Date | null;
  lastError?: string | null;
  needsFullResync: boolean;
}

export interface IForm {
  title: string;
  slug: string;
  description?: string;
  coverImage?: string | null;
  event: IFormEvent;
  status: FormStatus;
  closesAt?: Date | null;
  capacity?: number | null;
  contactFields: ContactFieldConfig[];
  sections: FormSection[];
  attendanceQuestionId?: string | null;
  settings: IFormSettings;
  sheets: IFormSheets;
  /** Respuestas que ocupan cupo (todas menos las que dicen "no asistiré"). */
  seatsTaken: number;
  createdBy?: mongoose.Types.ObjectId | string;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFormDocument extends IForm, Document {}

/** Respaldo para formularios nuevos: nombre y teléfono obligatorios. */
export const DEFAULT_CONTACT_FIELDS: ContactFieldConfig[] = [
  { field: 'fullName', mode: 'required' },
  { field: 'phone', mode: 'required' },
  { field: 'email', mode: 'optional' },
  { field: 'birthday', mode: 'hidden' },
  { field: 'ageRange', mode: 'hidden' },
  { field: 'gender', mode: 'hidden' },
  { field: 'group', mode: 'hidden' },
];

const conditionSchema = new Schema(
  {
    questionId: { type: String, required: true },
    op: { type: String, enum: CONDITION_OPS, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: QUESTION_TYPES, required: true },
    label: { type: String, trim: true, maxlength: 300, default: '' },
    help: { type: String, trim: true, maxlength: 500 },
    required: { type: Boolean, default: false },
    options: [
      new Schema(
        {
          id: { type: String, required: true },
          label: { type: String, trim: true, maxlength: 200, default: '' },
        },
        { _id: false }
      ),
    ],
    validation: {
      type: new Schema(
        { min: Number, max: Number, maxLength: Number },
        { _id: false }
      ),
      default: undefined,
    },
    showIf: { type: conditionSchema, default: null },
  },
  { _id: false }
);

const sectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    showIf: { type: conditionSchema, default: null },
    questions: { type: [questionSchema], default: [] },
  },
  { _id: false }
);

const formSchema = new Schema<IFormDocument>(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [120, 'El título no puede exceder 120 caracteres'],
    },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, maxlength: 20000, default: '' },
    coverImage: { type: String, default: null },
    event: {
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      location: { type: String, trim: true, maxlength: 200, default: '' },
      mapsUrl: { type: String, trim: true, maxlength: 500, default: '' },
      cost: { type: Number, min: 0, default: null },
      costNote: { type: String, trim: true, maxlength: 200, default: '' },
    },
    status: { type: String, enum: FORM_STATUSES, default: 'DRAFT', index: true },
    closesAt: { type: Date, default: null },
    capacity: { type: Number, min: 1, default: null },
    contactFields: {
      type: [
        new Schema(
          {
            field: { type: String, enum: CONTACT_FIELDS, required: true },
            mode: { type: String, enum: CONTACT_FIELD_MODES, required: true },
          },
          { _id: false }
        ),
      ],
      default: () => DEFAULT_CONTACT_FIELDS.map(c => ({ ...c })),
    },
    sections: { type: [sectionSchema], default: [] },
    attendanceQuestionId: { type: String, default: null },
    settings: {
      allowGuests: { type: Boolean, default: true },
      pointsReward: { type: Number, min: 0, max: 500, default: 0 },
      showRegisterCta: { type: Boolean, default: true },
    },
    sheets: {
      enabled: { type: Boolean, default: false },
      spreadsheetId: { type: String, default: null },
      sheetName: { type: String, default: 'Respuestas' },
      lastSyncAt: { type: Date, default: null },
      lastError: { type: String, default: null },
      needsFullResync: { type: Boolean, default: false },
    },
    // Contador denormalizado: permite controlar el cupo con un update atómico
    seatsTaken: { type: Number, default: 0, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Young' },
    publishedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
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

formSchema.index({ deletedAt: 1, createdAt: -1 });

export default mongoose.model<IFormDocument>('Form', formSchema);
