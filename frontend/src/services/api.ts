// Configuración de la API - Fix temporal
const API_BASE_URL = 'http://localhost:4500/api'; // import.meta.env.VITE_API_URL || 'http://localhost:4500/api';

// Función para obtener el token del localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Función para establecer el token en localStorage
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

// Función para remover el token del localStorage
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userInfo');
};

// Función helper para construir URLs de API
export const buildApiUrl = (endpoint: string): string => {
  // Remover slash inicial si existe
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Función helper para hacer fetch con la URL base configurada
export const apiRequest = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const token = getAuthToken();
  
  console.log(`📡 API Request to: ${url}`);
  console.log(`🔑 Token presente:`, token ? 'SÍ' : 'NO');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Agregar token de autorización si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`🔐 Authorization header agregado`);
  } else {
    console.warn(`⚠️ No hay token disponible para la petición a ${endpoint}`);
  }
  
  return fetch(url, {
    headers,
    ...options,
  });
};

// Función helper para hacer fetch con archivos (multipart/form-data)
export const apiUpload = async (
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const token = getAuthToken();
  
  console.log(`📡 API Upload to: ${url}`);
  console.log(`🔑 Token presente:`, token ? 'SÍ' : 'NO');
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  // Agregar token de autorización si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log(`🔐 Authorization header agregado para upload`);
  } else {
    console.warn(`⚠️ No hay token disponible para el upload a ${endpoint}`);
  }
  
  return fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    ...options,
  });
};

export default API_BASE_URL;

// Función para debug - verificar estado de autenticación
export const debugAuthState = (): void => {
  const token = getAuthToken();
  const userRole = localStorage.getItem('userRole');
  const userInfo = localStorage.getItem('userInfo');
  
  console.log('🔍 Estado de autenticación:');
  console.log('- Token presente:', token ? 'SÍ' : 'NO');
  if (token) {
    console.log('- Token (primeros 20 chars):', token.substring(0, 20) + '...');
  }
  console.log('- Rol de usuario:', userRole);
  console.log('- Info de usuario:', userInfo ? 'Presente' : 'No presente');
};

// Función específica para generar placa
export const generatePlaca = async (youngId: string): Promise<any> => {
  const response = await apiRequest(`young/${youngId}/generate-placa`, {
    method: 'PUT'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al generar la placa');
  }

  return response.json();
};

// Función para cambiar contraseña
export const changePassword = async (youngId: string, currentPassword: string, newPassword: string): Promise<any> => {
  const response = await apiRequest(`young/${youngId}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al cambiar la contraseña');
  }

  return response.json();
};

// Función para generar nueva contraseña (solo admins)
export const generateNewPassword = async (youngId: string, newPassword: string): Promise<any> => {
  const response = await apiRequest(`young/${youngId}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify({
      new_password: newPassword
    })
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
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener el perfil del usuario');
  }

  const result = await response.json();
  return result.data; // Devolver directamente los datos del usuario
};

// ========== FUNCIONES QR Y ASISTENCIAS ==========

// Generar QR del día (solo administradores)
export const generateDailyQR = async (): Promise<any> => {
  const response = await apiRequest('qr/generate', {
    method: 'POST'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al generar código QR');
  }

  const result = await response.json();
  return result.data;
};

// Obtener QR activo del día
export const getCurrentQR = async (): Promise<any> => {
  const response = await apiRequest('qr/current', {
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'No hay QR activo para el día de hoy');
  }

  const result = await response.json();
  return result.data;
};

// Obtener estadísticas del QR actual
export const getQRStats = async (): Promise<any> => {
  const response = await apiRequest('qr/stats', {
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener estadísticas');
  }

  const result = await response.json();
  return result.data;
};

// Escanear QR y registrar asistencia
export const scanQRAndRegisterAttendance = async (code: string): Promise<any> => {
  const response = await apiRequest('attendance/scan', {
    method: 'POST',
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al registrar asistencia');
  }

  const result = await response.json();
  return result.data;
};

// Obtener mi historial de asistencias
export const getMyAttendanceHistory = async (page: number = 1, limit: number = 10): Promise<any> => {
  const response = await apiRequest(`attendance/my-history?page=${page}&limit=${limit}`, {
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener historial de asistencias');
  }

  const result = await response.json();
  return result.data;
};

// Obtener asistencias del día (solo administradores)
export const getTodayAttendances = async (): Promise<any> => {
  const response = await apiRequest('attendance/today', {
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener asistencias del día');
  }

  const result = await response.json();
  return result.data;
};

// Obtener estadísticas de asistencia
export const getAttendanceStats = async (startDate?: string, endDate?: string): Promise<any> => {
  let url = 'attendance/stats';
  const params = new URLSearchParams();
  
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await apiRequest(url, {
    method: 'GET'
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener estadísticas de asistencia');
  }

  const result = await response.json();
  return result.data;
};
