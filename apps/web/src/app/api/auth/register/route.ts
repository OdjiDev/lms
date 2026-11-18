import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const isProd = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/', maxAge };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const upstream = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json({ message: 'API injoignable' }, { status: 503 });
  }

  const payload = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;

  if (!upstream.ok) {
    return NextResponse.json(
      { message: payload.message ?? 'Inscription impossible' },
      { status: upstream.status },
    );
  }

  const response = NextResponse.json({
    user: payload.user,
    organizations: payload.organizations,
    activeOrganizationId: payload.activeOrganizationId,
  });

  response.cookies.set('lms_at', String(payload.accessToken), cookieOptions(Number(payload.expiresIn) || 900));
  response.cookies.set('lms_rt', String(payload.refreshToken), cookieOptions(60 * 60 * 24 * 30));
  response.cookies.set('lms_org', String(payload.activeOrganizationId), cookieOptions(60 * 60 * 24 * 30));

  return response;
}
