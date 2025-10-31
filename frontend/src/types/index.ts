export interface IYoung {
  id?: string;
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: Date | string;
  profileImage?: string;
  gender: 'masculino' | 'femenino' | '';
  role:
  | 'lider juvenil'
  | 'colaborador'
  | 'director'
  | 'subdirector'
  | 'club guias'
  | 'club conquistadores'
  | 'club aventureros'
  | 'escuela sabatica'
  | 'joven adventista'
  | 'simpatizante';
  role_name?: string; // Nombre del rol del sistema
  role_id?: string; // ID del rol
  // Grupo opcional 1..5
  group?: number;
  email: string;
  skills: string[];
  placa?: string; // Placa generada del joven
  totalPoints?: number; // ✅ Puntos totales de la temporada activa
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IYoungCreate
  extends Omit<IYoung, 'id' | 'createdAt' | 'updatedAt'> { }

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  ageRange?: string;
  gender?: string;
  role?: string;
  groups?: string[] | undefined; // Array de grupos para filtrar (1-5)
  sortBy?:
  | 'fullName'
  | 'birthday'
  | 'email'
  | 'role'
  | 'gender'
  | 'createdAt'
  | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Tipos para QR y Asistencias
export interface IQRCode {
  _id: string;
  code: string;
  generatedBy: string;
  generatedAt: Date | string;
  expiresAt: Date | string;
  isActive: boolean;
  dailyDate: string;
  usageCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IAttendance {
  _id: string;
  youngId: string;
  qrCodeId: string;
  attendanceDate: string;
  scannedAt: Date | string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface QRGenerateResponse {
  qrCode: IQRCode;
  qrImage: string; // Base64 data URL
  qrUrl: string;
}

export interface AttendanceHistoryResponse {
  attendances: IAttendance[];
  stats: {
    totalAttendances: number;
    thisMonthAttendances: number;
    hasAttendanceToday: boolean;
    todayAttendance?: IAttendance;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface TodayAttendancesResponse {
  attendances: Array<
    IAttendance & {
      youngId: IYoung;
    }
  >;
  date: string;
  stats: {
    totalPresent: number;
    totalYoung: number;
    attendancePercentage: number;
  };
}

// ===== Sistema de Puntos y Temporadas =====
export type SeasonStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface ISeason {
  id: string;
  name: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  status: SeasonStatus;
  settings?: {
    attendancePoints: number;
    referralBonusPoints: number;
    referralWelcomePoints: number;
    streakMinDays: number;
    streakLostAfterDays: number;
  };
  prizes?: {
    first?: string;
    second?: string;
    third?: string;
  };
  isActive?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ISeasonCreate {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  settings?: {
    attendancePoints?: number;
    referralBonusPoints?: number;
    referralWelcomePoints?: number;
    streakMinDays?: number;
    streakLostAfterDays?: number;
  };
  prizes?: {
    first?: string;
    second?: string;
    third?: string;
  };
}

export interface ISeasonUpdate {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  settings?: {
    attendancePoints?: number;
    referralBonusPoints?: number;
    referralWelcomePoints?: number;
    streakMinDays?: number;
    streakLostAfterDays?: number;
  };
  prizes?: {
    first?: string;
    second?: string;
    third?: string;
  };
}

export type TransactionType =
  | 'ATTENDANCE'
  | 'ACTIVITY'
  | 'REFERRAL'
  | 'REFERRAL_BONUS'
  | 'REFERRAL_WELCOME'
  | 'BONUS';

export interface IPointsTransaction {
  id: string;
  youngId: string;
  seasonId: string;
  type: TransactionType;
  points: number;
  description: string;
  referredYoungId?: string | { id?: string; fullName?: string };
  metadata?: Record<string, any>;
  createdAt: string | Date;
}

export interface IPointsBreakdown {
  total: number;
  byType: {
    ATTENDANCE: number;
    ACTIVITY: number;
    REFERRER_BONUS: number;
    REFERRED_BONUS: number;
  };
  transactionCount: number;
  season?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface IAssignPointsRequest {
  youngId: string;
  points: number;
  type: TransactionType;
  description: string;
  referredYoungId?: string;
  metadata?: Record<string, any>;
}

export interface ILeaderboardEntry {
  youngId: string;
  youngName: string;
  profileImage?: string;
  group?: number;
  totalPoints: number;
  currentRank: number;
  previousRank?: number;
  pointsByType: {
    attendance: number;
    activity: number;
    referrer: number;
    referred: number;
    bonus: number;
  };
  streak?: number;
}

// ===== Solicitudes de Registro =====
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected';

export interface IRegistrationRequest {
  id: string;
  fullName: string;
  ageRange: string;
  phone?: string;
  birthday: Date | string;
  gender?: 'masculino' | 'femenino' | '';
  role: string;
  email?: string;
  skills: string[];
  profileImage?: string;
  group?: number;
  placa?: string;
  referredBy?: {
    id: string;
    fullName: string;
    placa?: string;
    email?: string;
  } | null;
  referredByPlaca?: string;
  status: RegistrationRequestStatus;
  reviewedBy?: {
    id: string;
    fullName: string;
    email?: string;
  } | null;
  reviewedAt?: Date | string;
  rejectionReason?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IReviewRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface RegistrationRequestsPaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: RegistrationRequestStatus;
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'status';
  sortOrder?: 'asc' | 'desc';
}
