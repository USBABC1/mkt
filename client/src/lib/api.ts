// client/src/lib/api.ts
import { hc } from 'hono/client';
import type { AppType } from '../../../server/routes'; // Ajuste o caminho se necessário

// Helper para obter a URL da API do ambiente
export const getApiUrl = (): string => { // <-- ADICIONADO "export" AQUI
  return import.meta.env.VITE_API_URL || '';
};

// Cria o cliente Hono RPC
const client = hc<AppType>(getApiUrl());

export const api = client;

// Funções existentes que podem ser úteis em outros lugares ou refatoradas depois
// Se elas não forem mais usadas, podem ser removidas.

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  isFormData: boolean = false
): Promise<Response> {
  const fullApiUrl = `${getApiUrl()}${url.startsWith('/') ? url : `/${url}`}`;

  const headers: Record<string, string> = {};

  if (!isFormData && data) {
    headers['Content-Type'] = 'application/json';
  }

  let body;
  if (isFormData && data instanceof FormData) {
    body = data;
  } else if (data) {
    body = JSON.stringify(data);
  } else {
    body = undefined;
  }

  const response = await fetch(fullApiUrl, {
    method,
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response;
}


export async function uploadFile(
  url: string,
  file: File,
  additionalData?: Record<string, string>,
  method: string = 'POST'
): Promise<Response> {
    const fullApiUrl = `${getApiUrl()}${url.startsWith('/') ? url : `/${url}`}`;


    const formData = new FormData();
    formData.append('file', file);
  
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
  
    const headers: Record<string, string> = {};
  
    const response = await fetch(fullApiUrl, {
      method: method,
      headers,
      body: formData,
    });
  
    if (!response.ok) {
        throw new Error(`Upload Error: ${response.status}`);
    }
  
    return response;
}
