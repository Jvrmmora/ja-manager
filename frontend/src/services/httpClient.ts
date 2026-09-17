// Wrapper HTTP de bajo nivel usado por todos los servicios de dominio
// (youngAccountApi, attendanceApi, registrationApi, api.ts). Vive en su
// propio módulo para que esos archivos puedan importarlo sin crear una
// dependencia circular con api.ts, que los re-exporta.

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4500/api';

const isDev = import.meta.env.DEV;

// Función para obtener el token del localStorage
export const getAuthToken = (): string | null => {
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
  // Como API_BASE_URL ya incluye /api, solo agregamos el endpoint
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Función helper para hacer fetch con la URL base configurada
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const token = getAuthToken();

  if (isDev) console.debug(`[api] ${options.method || 'GET'} ${endpoint}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Agregar token de autorización si existe (siempre va al final para no ser sobrescrito)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
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

  if (isDev) console.debug(`[api] upload ${endpoint}`);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
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

// Función para debug - verificar estado de autenticación (solo en desarrollo,
// nunca imprime el token).
export const debugAuthState = (): void => {
  if (!isDev) return;
  console.debug('[auth] token:', getAuthToken() ? 'present' : 'absent', {
    role: localStorage.getItem('userRole'),
    hasUserInfo: Boolean(localStorage.getItem('userInfo')),
  });
};

export default API_BASE_URL;
