// Tipos del módulo de formularios (espejo de backend/src/services/forms/domain/types.ts)

export type QuestionType =
  | 'short_text'
  | 'paragraph'
  | 'single_choice'
  | 'multi_choice'
  | 'dropdown'
  | 'yes_no'
  | 'date'
  | 'number';

export type ConditionOp = 'equals' | 'not_equals' | 'includes';

export interface FormCondition {
  questionId: string;
  op: ConditionOp;
  value: string;
}

export interface FormOption {
  id: string;
  label: string;
}

export interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  help?: string;
  required: boolean;
  options?: FormOption[];
  validation?: { min?: number; max?: number; maxLength?: number };
  showIf?: FormCondition | null;
}

export interface FormSection {
  id: string;
  title?: string;
  description?: string;
  showIf?: FormCondition | null;
  questions: FormQuestion[];
}

export type ContactField =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'birthday'
  | 'ageRange'
  | 'gender'
  | 'group';

export type ContactFieldMode = 'required' | 'optional' | 'hidden';

export interface ContactFieldConfig {
  field: ContactField;
  mode: ContactFieldMode;
}

export type AnswerValue = string | string[] | number;
export type AnswerMap = Record<string, AnswerValue>;
export type ContactValues = Partial<Record<ContactField, string>>;

export interface FormEvent {
  startsAt?: string | null;
  endsAt?: string | null;
  location?: string;
  mapsUrl?: string;
  cost?: number | null;
  costNote?: string;
}

export type FormStatus = 'DRAFT' | 'OPEN' | 'CLOSED';
export type FormAvailability = 'draft' | 'open' | 'closed' | 'full';
export type RespondentKind = 'session' | 'placa' | 'guest';

export interface PublicForm {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string | null;
  event: FormEvent;
  status: FormStatus;
  closesAt?: string | null;
  spotsLeft: number | null;
  contactFields: ContactFieldConfig[];
  sections: FormSection[];
  settings: { allowGuests: boolean; pointsReward: number; showRegisterCta: boolean };
}

export interface PublicFormMe {
  fullName: string;
  shortName: string;
  placa: string | null;
  profileImage: string | null;
  contact: Partial<Record<ContactField, string | number | null>>;
  missing: ContactField[];
}

export interface PublicFormData {
  form: PublicForm;
  availability: FormAvailability;
  me: PublicFormMe | null;
  myResponse: { answers: AnswerMap; contact: ContactValues; updatedAt: string } | null;
}

export interface PlacaIdentity {
  placa: string;
  shortName: string;
  profileImage: string | null;
  masked: { phone: string | null; email: string | null };
  saved: ContactField[];
  missing: ContactField[];
  alreadyResponded: boolean;
}

export interface SubmitResult {
  responseId: string;
  updated: boolean;
  kind: RespondentKind;
  attending: boolean | null;
  pointsAwarded: number;
}

// ─── Administración ──────────────────────────────────────────────────────────

export interface FormSettings {
  allowGuests: boolean;
  pointsReward: number;
  showRegisterCta: boolean;
}

export interface FormSheets {
  enabled: boolean;
  spreadsheetId?: string | null;
  sheetName: string;
  lastSyncAt?: string | null;
  lastError?: string | null;
  needsFullResync: boolean;
}

export interface AdminForm {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string | null;
  event: FormEvent;
  status: FormStatus;
  closesAt: string | null;
  capacity: number | null;
  seatsTaken: number;
  contactFields: ContactFieldConfig[];
  sections: FormSection[];
  attendanceQuestionId: string | null;
  settings: FormSettings;
  sheets: FormSheets;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormListItem {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  coverImage: string | null;
  event: FormEvent;
  closesAt: string | null;
  capacity: number | null;
  seatsTaken: number;
  hasAttendanceQuestion: boolean;
  responses: number;
  attending: number;
  sheetsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponseItem {
  id: string;
  respondent: {
    kind: RespondentKind;
    youngId: string | null;
    placa: string | null;
    contact: Partial<Record<ContactField, string | number>>;
  };
  answers: AnswerMap;
  attending: boolean | null;
  pointsTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormStats {
  total: number;
  attendance: { yes: number; no: number; unknown: number };
  byKind: Record<RespondentKind, number>;
  seatsTaken: number;
  capacity: number | null;
  questions: {
    questionId: string;
    label: string;
    type: QuestionType;
    answered: number;
    options: { id: string; label: string; count: number }[];
  }[];
}
