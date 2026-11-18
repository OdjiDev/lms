import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiSafe } from './api';
import type { MeResponse } from './types';

/**
 * `cache()` déduplique l'appel : le layout et la page partagent
 * la même requête /auth/me pendant un rendu.
 */
export const getSession = cache(async (): Promise<MeResponse | null> => {
  return apiSafe<MeResponse>('/auth/me');
});

export type ActiveMembership = MeResponse['memberships'][number];

export async function requireSession(): Promise<{
  me: MeResponse;
  active: ActiveMembership;
}> {
  const me = await getSession();
  if (!me) redirect('/login');

  const jar = await cookies();
  const orgId = jar.get('lms_org')?.value;
  const active = me.memberships.find((m) => m.organization.id === orgId) ?? me.memberships[0];

  if (!active) redirect('/login');
  return { me, active };
}

export function canManage(role: string): boolean {
  return role !== 'LEARNER';
}
