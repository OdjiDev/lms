import { cookies } from 'next/headers';
import type { MyProgress, Paginated, CourseCard, CourseDetail, OrgStats, Enrollment } from './types';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

export const ACCESS_COOKIE = 'lms_at';
export const REFRESH_COOKIE = 'lms_rt';
export const ORG_COOKIE = 'lms_org';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string;
  orgId?: string;
}

/** Appel API côté serveur (Server Components / Server Actions). */
export async function api<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const jar = await cookies();
  const token = options.token ?? jar.get(ACCESS_COOKIE)?.value;
  const orgId = options.orgId ?? jar.get(ORG_COOKIE)?.value;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (orgId) headers.set('X-Org-Id', orgId);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Erreur API (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (payload.message) {
        message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
      }
    } catch {
      /* corps non JSON */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Renvoie null au lieu de lever : pratique dans les Server Components. */
export async function apiSafe<T>(path: string, options: ApiFetchOptions = {}): Promise<T | null> {
  try {
    return await api<T>(path, options);
  } catch {
    return null;
  }
}

// ── Endpoints typés ────────────────────────────────────────────────────

export const endpoints = {
  login: (body: { email: string; password: string; organizationSlug?: string }) => ({
    path: '/auth/login',
    body,
  }),
  register: (body: {
    organizationName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => ({ path: '/auth/register', body }),
  me: '/auth/me',
  courses: (query?: { search?: string }) =>
    `/courses${query?.search ? `?search=${encodeURIComponent(query.search)}` : ''}`,
  course: (id: string) => `/courses/${id}`,
  myEnrollments: '/me/enrollments',
  myProgress: (courseId: string) => `/courses/${courseId}/my-progress`,
  stats: '/stats',
} as const;

export type { Paginated, CourseCard, CourseDetail, OrgStats, Enrollment, MyProgress };
