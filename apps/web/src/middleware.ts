import { NextResponse, type NextRequest } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_COOKIE = 'lms_at';
const REFRESH_COOKIE = 'lms_rt';
const ORG_COOKIE = 'lms_org';

const isProd = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge,
  };
}

/** Lit `exp` sans vérifier la signature (le serveur API reste juge). */
function expiresAt(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    const parsed = JSON.parse(json) as { exp?: number };
    return typeof parsed.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * Rafraîchit l'access token AVANT expiration, côté edge.
 * Sans ça, l'utilisateur serait déconnecté toutes les 15 minutes.
 */
export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return redirectToLogin(request);
  }

  const exp = accessToken ? expiresAt(accessToken) : null;
  const stillFresh = exp !== null && exp - Math.floor(Date.now() / 1000) > 60;
  if (stillFresh) return NextResponse.next();

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);

  if (!response?.ok) {
    const redirect = redirectToLogin(request);
    redirect.cookies.delete(ACCESS_COOKIE);
    redirect.cookies.delete(REFRESH_COOKIE);
    redirect.cookies.delete(ORG_COOKIE);
    return redirect;
  }

  const tokens = (await response.json()) as { accessToken: string; refreshToken: string; expiresIn: number };

  const next = NextResponse.next();
  next.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn));
  next.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(60 * 60 * 24 * 30));
  return next;
}

function redirectToLogin(request: NextRequest) {
  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/dashboard/:path*', '/courses/:path*', '/learn/:path*'],
};
