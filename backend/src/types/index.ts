export interface IYoung {
  _id?: string;
  fullName: string;
  placa?: string;
  password?: string;
  role_id?: string;
  role_name?: string;
  ageRange: string;
  phone: string;
  birthday: Date;
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
  // Grupo opcional (1..5)
  group?: number;
  email: string;
  skills: string[];
  first_login?: boolean;
  referredBy?: string; // ID del joven que lo refirió
  totalPoints?: number; // ✅ Puntos totales (calculado, no persistido)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRole {
  _id?: string;
  name: string;
  description: string;
  scopes: string[];
  created_at: Date;
  updated_at?: Date | null;
  deleted_at?: Date | null;
}

export interface IAuthUser {
  userId: string; // ID único del usuario
  username: string; // placa o email
  email: string;
  fullName: string;
  role_id: string;
  role_name: string;
  exp?: number; // Para JWT expiration timestamp
}

export interface IDecodedToken extends IAuthUser {
  exp: number;
  iat: number;
}

export interface ILoginRequest {
  username: string; // puede ser email o placa
  password: string;
}

export interface ILoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: IAuthUser;
    expiresIn: string;
  };
  error?: string;
}

export interface IYoungCreate
  extends Omit<IYoung, '_id' | 'createdAt' | 'updatedAt'> {}

export interface IYoungUpdate extends Partial<IYoungCreate> {}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  ageRange?: string;
  gender?: string;
  role?: string;
  groups?: string[] | string;
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

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface IQRCode {
  _id?: string;
  code: string;
  generatedBy: string;
  generatedAt: Date;
  expiresAt: Date;
  isActive: boolean;
  dailyDate: string;
  usageCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAttendance {
  _id?: string;
  youngId: string;
  qrCodeId: string;
  attendanceDate: string;
  scannedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
