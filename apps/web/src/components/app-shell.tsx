'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { switchOrganizationAction } from '@/app/actions';
import type { MeResponse } from '@/lib/types';
import { BookIcon, DashboardIcon, MenuIcon, PlusIcon, UsersIcon } from '@/components/icons';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: DashboardIcon },
  { href: '/courses', label: 'Catalogue', icon: BookIcon },
  { href: '/team', label: 'Équipe', icon: UsersIcon, staffOnly: true },
] as const;

export function AppShell({
  user,
  memberships,
  activeOrganizationId,
  children,
}: {
  user: MeResponse;
  memberships: MeResponse['memberships'];
  activeOrganizationId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = memberships.find((m) => m.organization.id === activeOrganizationId) ?? memberships[0];
  const canManage = active?.role !== 'LEARNER';
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  function onSwitchOrg(orgId: string) {
    const data = new FormData();
    data.set('orgId', orgId);
    startTransition(async () => {
      await switchOrganizationAction(data);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-ink-950 p-5 text-white transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-base font-black text-ink-950">
            Y
          </span>
          <span className="text-sm font-bold leading-tight">
            Yellow LMS
            <span className="block text-[11px] font-medium text-white/45">Learning platform</span>
          </span>
        </Link>

        <div className="mt-6 rounded-xl bg-white/5 p-2">
          <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
            Organisation
          </p>
          <select
            value={active?.organization.id}
            onChange={(event) => onSwitchOrg(event.target.value)}
            disabled={pending}
            className="w-full cursor-pointer rounded-lg bg-transparent px-2 py-1.5 text-sm font-semibold text-white outline-none"
          >
            {memberships.map((membership) => (
              <option key={membership.organization.id} value={membership.organization.id} className="text-ink-900">
                {membership.organization.name}
              </option>
            ))}
          </select>
        </div>

        <nav className="mt-6 space-y-1">
          {NAV.filter((item) => !('staffOnly' in item && item.staffOnly) || canManage).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-brand-500 text-ink-950' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
          {canManage ? (
            <Link
              href="/courses/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <PlusIcon className="size-[18px]" />
              Nouveau cours
            </Link>
          ) : null}
        </nav>

        <div className="absolute inset-x-4 bottom-5">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-400 text-xs font-bold text-ink-950">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[11px] text-white/45">{active?.role ?? '—'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink-950/50 lg:hidden"
        />
      ) : null}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/5 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn-ghost px-3 py-2"
            aria-label="Ouvrir le menu"
          >
            <MenuIcon className="size-5" />
          </button>
          <span className="text-sm font-bold">Yellow LMS</span>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
