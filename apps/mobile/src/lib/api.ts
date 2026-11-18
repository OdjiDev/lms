import type { AuthSession } from '@lms/types';

/**
 * URL de l'API vue depuis l'appareil.
 * - iOS simulator / web : http://localhost:4000/api/v1
 * - Android emulator    : http://10.0.2.2:4000/api/v1
 * - Téléphone physique  : http://<IP_LAN>:4000/api/v1
 * Surcharger avec EXPO_PUBLIC_API_URL dans apps/mobile/.env
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  orgId?: string;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.orgId) headers['X-Org-Id'] = options.orgId;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, `API injoignable (${API_URL}). Vérifiez que le serveur tourne.`);
  }

  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (payload.message) {
        message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export type { AuthSession };
