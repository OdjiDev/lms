import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthSession, MeResponse } from '@lms/types';
import { ApiError, request, type RequestOptions } from './api';

const STORAGE_KEY = 'lms.session';

/** SecureStore n'existe pas sur le web : repli sur localStorage (dev). */
const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof globalThis.localStorage === 'undefined'
        ? null
        : globalThis.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthContextValue {
  session: AuthSession | null;
  user: MeResponse | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(async (next: AuthSession | null) => {
    if (next) await storage.set(STORAGE_KEY, JSON.stringify(next));
    else await storage.remove(STORAGE_KEY);
    setSession(next);
  }, []);

  const loadUser = useCallback(async (current: AuthSession) => {
    const me = await request<MeResponse>('/auth/me', {
      token: current.accessToken,
    });
    setUser(me);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await storage.get(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as AuthSession;
        setSession(parsed);
        await loadUser(parsed);
      } catch {
        await storage.remove(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const next = await request<AuthSession>('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      });
      await persist(next);
      await loadUser(next);
    },
    [loadUser, persist],
  );

  const logout = useCallback(async () => {
    if (session) {
      await request('/auth/logout', {
        method: 'POST',
        body: { refreshToken: session.refreshToken },
      }).catch(() => undefined);
    }
    setUser(null);
    await persist(null);
  }, [persist, session]);

  /** Fetch authentifié avec rotation automatique du refresh token. */
  const authedRequest = useCallback(
    async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
      if (!session) throw new ApiError(401, 'Session expirée');

      try {
        return await request<T>(path, {
          ...options,
          token: session.accessToken,
          orgId: options.orgId ?? session.activeOrganizationId,
        });
      } catch (caught) {
        if (!(caught instanceof ApiError) || caught.status !== 401) throw caught;

        const refreshed = await request<{
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        }>('/auth/refresh', {
          method: 'POST',
          body: { refreshToken: session.refreshToken },
        });

        const next: AuthSession = { ...session, ...refreshed };
        await persist(next);

        return request<T>(path, {
          ...options,
          token: next.accessToken,
          orgId: options.orgId ?? next.activeOrganizationId,
        });
      }
    },
    [persist, session],
  );

  const refreshUser = useCallback(async () => {
    const current = session;
    if (!current) return;
    const me = await request<MeResponse>('/auth/me', { token: current.accessToken });
    setUser(me);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, loading, error, login, logout, request: authedRequest, refreshUser }),
    [session, user, loading, error, login, logout, authedRequest, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return context;
}
