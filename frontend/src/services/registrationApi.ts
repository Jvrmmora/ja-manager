import { apiRequest, buildApiUrl } from './httpClient';

// Función para crear solicitud de registro (pública, no requiere autenticación)
export const createRegistrationRequest = async (
  formData: FormData
): Promise<any> => {
  const url = buildApiUrl('registration');

  // Esta ruta no requiere token
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message ||
        errorData.error?.message ||
        'Error al crear solicitud de registro'
    );
  }

  const result = await response.json();
  return result;
};

// Obtener todas las solicitudes de registro (solo Super Admin)
export const getAllRegistrationRequests = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'approved' | 'rejected';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  const url = `registration${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiRequest(url, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener solicitudes de registro'
    );
  }

  const result = await response.json();
  return result.data;
};

// Obtener una solicitud por ID (solo Super Admin)
export const getRegistrationRequestById = async (id: string): Promise<any> => {
  const response = await apiRequest(`registration/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al obtener la solicitud de registro'
    );
  }

  const result = await response.json();
  return result.data;
};

// Aprobar o rechazar una solicitud (solo Super Admin)
export const reviewRegistrationRequest = async (
  id: string,
  review: {
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }
): Promise<any> => {
  const response = await apiRequest(`registration/${id}/review`, {
    method: 'PUT',
    body: JSON.stringify(review),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || 'Error al revisar la solicitud de registro'
    );
  }

  const result = await response.json();
  return result.data;
};
