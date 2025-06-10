// client/src/lib/api.ts
import { useAuthStore } from './auth';

// Helper para construir a URL completa da API
function getApiUrl(path: string): string {
  const apiUrlFromEnv = import.meta.env.VITE_API_URL;
  if (apiUrlFromEnv && typeof apiUrlFromEnv === 'string' && apiUrlFromEnv.trim() !== '') {
    // Remove barras extras e junta
    const base = apiUrlFromEnv.replace(/\/$/, '');
    const endpoint = path.startsWith('/') ? path : `/${path}`;
    return `${base}${endpoint}`;
  }
  // Se VITE_API_URL não estiver definida, assume que a URL já é completa ou relativa à origem (para proxy)
  return path;
}

export async function apiRequest(
  method: string,
  url: string, // url agora é o PATH da API, ex: /auth/login
  data?: unknown,
  isFormData: boolean = false
): Promise<Response> {
  const { token } = useAuthStore.getState();
  const fullApiUrl = getApiUrl(url); // Constrói a URL completa

  const headers: Record<string, string> = {};

  if (!isFormData && data) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let body;
  if (isFormData && data instanceof FormData) {
    body = data;
  } else if (data) {
    body = JSON.stringify(data);
  } else {
    body = undefined;
  }

  const response = await fetch(fullApiUrl, { // Usa fullApiUrl
    method,
    headers,
    body,
  });

  if (!response.ok) {
    let errorMessage;
    try {
      const errorPayload = await response.json();
      if (errorPayload && typeof errorPayload === 'object') {
        if (errorPayload.error && typeof errorPayload.error === 'string' && errorPayload.error.trim() !== '') {
          errorMessage = errorPayload.error;
        } else if (errorPayload.message && typeof errorPayload.message === 'string' && errorPayload.message.trim() !== '') {
          errorMessage = errorPayload.message;
        }
      }
    } catch (e) {
      try {
        const errorText = await response.text();
        if (errorText && errorText.trim() !== '') {
          errorMessage = errorText;
        }
      } catch (textError) {}
    }

    if (!errorMessage) {
      errorMessage = `API Error: ${response.status} ${response.statusText || ''}`.trim();
    }
    throw new Error(errorMessage);
  }

  return response;
}

export async function uploadFile(
  url: string, // url agora é o PATH da API, ex: /creatives
  file: File,
  additionalData?: Record<string, string>,
  method: string = 'POST'
): Promise<Response> {
  const { token } = useAuthStore.getState();
  const fullApiUrl = getApiUrl(url); // Constrói a URL completa

  const formData = new FormData();
  formData.append('file', file); 

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullApiUrl, { // Usa fullApiUrl
    method: method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    let errorMessage;
    try {
      const errorPayload = await response.json();
      if (errorPayload && typeof errorPayload === 'object') {
        if (errorPayload.error && typeof errorPayload.error === 'string' && errorPayload.error.trim() !== '') {
          errorMessage = errorPayload.error;
        } else if (errorPayload.message && typeof errorPayload.message === 'string' && errorPayload.message.trim() !== '') {
          errorMessage = errorPayload.message;
        }
      }
    } catch (e) {
      try {
        const errorText = await response.text();
        if (errorText && errorText.trim() !== '') {
          errorMessage = errorText;
        }
      } catch (textError) {}
    }

    if (!errorMessage) {
      errorMessage = `Upload Error: ${response.status} ${response.statusText || ''}`.trim();
    }
    throw new Error(errorMessage);
  }

  return response;
}
