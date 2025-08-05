// Configuración de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4500';

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
  console.log(`📡 API Request to: ${url}`);
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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
  console.log(`📡 API Upload to: ${url}`);
  
  return fetch(url, {
    method: 'POST',
    body: formData,
    ...options,
  });
};

export default API_BASE_URL;
