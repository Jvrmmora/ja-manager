export interface IYoung {
  _id?: string;
  fullName: string;
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
