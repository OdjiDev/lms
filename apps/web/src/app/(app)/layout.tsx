import { AppShell } from '@/components/app-shell';
import { requireSession } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, active } = await requireSession();

  return (
    <AppShell
      user={me}
      memberships={me.memberships}
      activeOrganizationId={active.organization.id}
    >
      {children}
    </AppShell>
  );
}
