import { supabase } from '../supabaseClient';
import { ApiResponse } from './types';

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new ApiError(data.error?.message || data.error || 'API Request Failed', data.error?.code || response.status.toString());
    }

    // Wrap in standard response even if backend didn't
    return {
      success: true,
      data: data.data !== undefined ? data.data : data
    };
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: error.code || 'REQUEST_FAILED',
        message: error.message || 'An unexpected error occurred'
      }
    };
  }
}

export const apiClient = {
  get: <T>(url: string) => fetchApi<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: any) => fetchApi<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(url: string, body?: any) => fetchApi<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(url: string, body?: any) => fetchApi<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(url: string) => fetchApi<T>(url, { method: 'DELETE' }),
};
