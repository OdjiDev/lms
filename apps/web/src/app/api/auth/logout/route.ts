import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

export async function POST(request: Request) {
  const jar = await cookies();
  const refreshToken = jar.get('lms_rt')?.value;

  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true });
  for (const name of ['lms_at', 'lms_rt', 'lms_org']) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return response;
}
