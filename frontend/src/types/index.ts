export interface IYoung {
  id?: string;
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: Date | string;
  profileImage?: string;
  gender: 'masculino' | 'femenino' | '';
  role: 'lider juvenil' | 'colaborador' | 'director' | 'subdirector' | 'club guias' | 'club conquistadores' | 'club aventureros' | 'escuela sabatica' | 'joven adventista' | 'simpatizante';
  role_name?: string; // Nombre del rol del sistema
  role_id?: string; // ID del rol
  // Grupo opcional 1..5
  group?: number;
  email: string;
  skills: string[];
  placa?: string; // Placa generada del joven
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IYoungCreate extends Omit<IYoung, 'id' | 'createdAt' | 'updatedAt'> {}

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
  sortBy?: 'fullName' | 'birthday' | 'email' | 'role' | 'gender' | 'createdAt' | 'updatedAt';
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
  attendances: Array<IAttendance & {
    youngId: IYoung;
  }>;
  date: string;
  stats: {
    totalPresent: number;
    totalYoung: number;
    attendancePercentage: number;
  };
}