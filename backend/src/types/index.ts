export interface IYoung {
  _id?: string;
  fullName: string;
  ageRange: string;
  phone: string;
  birthday: Date;
  profileImage?: string;
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
  sortBy?: 'fullName' | 'birthday' | 'createdAt';
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
