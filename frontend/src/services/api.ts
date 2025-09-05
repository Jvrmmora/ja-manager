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
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Agregar token de autorización si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  // Agregar token de autorización si existe
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    ...options,
  });
};

export default API_BASE_URL;
