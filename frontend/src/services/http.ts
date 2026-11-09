/**
 * Cliente HTTP mínimo y tipado.
 *
 * El prototipo funciona con VITE_USE_MOCK=true. Cuando el backend ASP.NET Core
 * esté disponible, basta con poner VITE_USE_MOCK=false y VITE_API_URL=https://...
 * Los servicios conservan los mismos contratos de entrada/salida.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? 'http://localhost:5091';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const TOKEN_KEY = 'epa_token';
export const USER_KEY = 'epa_user';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type HttpOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(isFormData ? {} : body ? { 'Content-Type': 'application/json' } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      message = problem.detail ?? problem.title ?? message;
    } catch {
      // La API podría devolver texto plano o un cuerpo vacío.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export const sleep = (ms = 450) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));
