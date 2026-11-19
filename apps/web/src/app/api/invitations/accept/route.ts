import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const isProd = process.env.NODE_ENV === 'production';

function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure: isProd, path: '/', maxAge };
}

/**
 * Acceptation d'invitation : l'API renvoie une session, le handler pose
 * les mêmes cookies que /api/auth/login.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token : '';

  if (!token) {
    return NextResponse.json({ message: 'Invitation invalide' }, { status: 400 });
  }

  const upstream = await fetch(`${API_URL}/invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: body.password,
      firstName: body.firstName,
      lastName: body.lastName,
    }),
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json({ message: 'API injoignable' }, { status: 503 });
  }

  const payload = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;

  if (!upstream.ok) {
    return NextResponse.json(
      { message: payload.message ?? 'Impossible d’accepter l’invitation' },
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
