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
  role: 'lider juvenil' | 'colaborador' | 'director' | 'subdirector' | 'club guias' | 'club conquistadores' | 'club aventureros' | 'escuela sabatica' | 'joven adventista' | 'simpatizante';
  // Grupo opcional (1..5)
  group?: number;
  email: string;
  skills: string[];
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
  username: string; // placa o email
  email: string;
  fullName: string;
  role_id: string;
  role_name: string;
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

export interface IYoungCreate extends Omit<IYoung, '_id' | 'createdAt' | 'updatedAt'> {}

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
  sortBy?: 'fullName' | 'birthday' | 'email' | 'role' | 'gender' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
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
