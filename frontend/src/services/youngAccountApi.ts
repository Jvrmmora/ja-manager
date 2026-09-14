import { apiRequest } from './httpClient';

// Función específica para generar placa
export const generatePlaca = async (youngId: string): Promise<any> => {
  const response = await apiRequest(`young/${youngId}/generate-placa`, {
    method: 'PUT',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al generar la placa');
  }

  return response.json();
};

// Función para cambiar contraseña
export const changePassword = async (
  youngId: string,
  currentPassword: string,
  newPassword: string
): Promise<any> => {
  const response = await apiRequest(`young/${youngId}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al cambiar la contraseña');
  }

  return response.json();
};

// Función para generar nueva contraseña (solo admins)
export const generateNewPassword = async (
  youngId: string,
  newPassword: string
): Promise<any> => {
  const response = await apiRequest(`young/${youngId}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({
      new_password: newPassword,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al generar nueva contraseña');
  }

  return response.json();
};

// Función para obtener el perfil del usuario logueado
export const getCurrentUserProfile = async (): Promise<any> => {
  const response = await apiRequest(`auth/profile`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener el perfil del usuario'
    );
  }

  const result = await response.json();
  return result.data; // Devolver directamente los datos del usuario
};

// Obtener usuarios Young registrados recientemente (últimos X días)
export const getRecentYoungUsers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  days?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.days) queryParams.append('days', params.days.toString());

  const url = `young/recent${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiRequest(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener registros recientes'
    );
  }

  const result = await response.json();
  return result.data;
};

// Obtener conteo de usuarios registrados recientemente
export const getRecentUsersCount = async (
  hours: number = 48
): Promise<number> => {
  const response = await apiRequest(`young/recent/count?hours=${hours}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener contador de usuarios recientes'
    );
  }

  const result = await response.json();
  return result.data.count;
};

// Marcar usuario como spam
export const markUserAsSpam = async (
  id: string,
  isSpam: boolean = true
): Promise<any> => {
  const response = await apiRequest(`young/${id}/mark-spam`, {
    method: 'PATCH',
    body: JSON.stringify({ isSpam }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al marcar usuario como spam');
  }

  const result = await response.json();
  return result.data;
};

// Eliminar usuario (soft delete)
export const deleteYoungUser = async (id: string): Promise<any> => {
  const response = await apiRequest(`young/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al eliminar usuario');
  }

  const result = await response.json();
  return result.data;
};
