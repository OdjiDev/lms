import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revokeInvitationAction, resendInvitationAction } from '@/app/actions';
import { apiSafe } from '@/lib/api';
import { canManage, requireSession } from '@/lib/session';
import type {
  CourseCard,
  Invitation,
  InvitationStatus,
  Paginated,
  Role,
} from '@/lib/types';
import { PageHeader } from '@/components/ui';
import { ImportForm } from './import-form';
import { InviteForm } from './invite-form';

interface Member {
  id: string;
  role: Role;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
  };
}

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  INSTRUCTOR: 'Formateur',
  LEARNER: 'Apprenant',
};

const STATUS_STYLES: Record<InvitationStatus, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  ACCEPTED: { label: 'Acceptée', className: 'bg-emerald-100 text-emerald-800' },
  REVOKED: { label: 'Annulée', className: 'bg-slate-200 text-slate-600' },
  EXPIRED: { label: 'Expirée', className: 'bg-red-100 text-red-700' },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export default async function TeamPage() {
  const { active } = await requireSession();
  if (!canManage(active.role)) redirect('/dashboard');

  const canInvite = active.role === 'OWNER' || active.role === 'ADMIN';

  const [members, invitations, courses] = await Promise.all([
    apiSafe<Member[]>('/users'),
    apiSafe<Invitation[]>('/invitations'),
    apiSafe<Paginated<CourseCard>>('/courses?limit=100'),
  ]);

  const memberList = members ?? [];
  const invitationList = invitations ?? [];
  const courseList = courses?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Équipe & invitations"
        subtitle="Gérez les accès à votre organisation et suivez les invitations en cours."
      />

      {canInvite ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <InviteForm courses={courseList} />
          <ImportForm courses={courseList} />
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">Invitations</h2>
          <span className="text-sm text-ink-500">
            {invitationList.filter((item) => item.status === 'PENDING').length} en attente
          </span>
        </div>

        {invitationList.length === 0 ? (
          <div className="card p-5 text-sm text-ink-500">Aucune invitation pour le moment.</div>
        ) : (
          <div className="card divide-y divide-black/5 overflow-hidden">
            {invitationList.map((invitation) => {
              const status = STATUS_STYLES[invitation.status];
              return (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {invitation.firstName || invitation.lastName
                          ? `${invitation.firstName ?? ''} ${invitation.lastName ?? ''}`.trim()
                          : invitation.email}
                      </p>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                      {invitation.firstName || invitation.lastName ? (
                        <span className="truncate">{invitation.email}</span>
                      ) : null}
                      <span>{ROLE_LABELS[invitation.role]}</span>
                      {invitation.course ? <span>· {invitation.course.title}</span> : null}
                      <span>· envoyée le {formatDate(invitation.createdAt)}</span>
                      {invitation.status === 'PENDING' ? (
                        <span>· expire le {formatDate(invitation.expiresAt)}</span>
                      ) : null}
                    </p>
                  </div>

                  {canInvite && invitation.status !== 'ACCEPTED' ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={resendInvitationAction}>
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <button type="submit" className="btn btn-ghost">
                          Renvoyer
                        </button>
                      </form>
                      {invitation.status === 'PENDING' ? (
                        <form action={revokeInvitationAction}>
                          <input type="hidden" name="invitationId" value={invitation.id} />
                          <button type="submit" className="btn btn-ghost text-red-700">
                            Annuler
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">Membres</h2>
          <span className="text-sm text-ink-500">{memberList.length} personne(s)</span>
        </div>

        <div className="card divide-y divide-black/5 overflow-hidden">
          {memberList.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">
                  {`${member.user.firstName[0] ?? ''}${member.user.lastName[0] ?? ''}`.toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {member.user.firstName} {member.user.lastName}
                  </p>
                  <p className="truncate text-xs text-ink-500">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {member.user.lastLoginAt ? (
                  <span className="text-xs text-ink-500">
                    Vu le {formatDate(member.user.lastLoginAt)}
                  </span>
                ) : (
                  <span className="text-xs text-ink-500">Jamais connecté</span>
                )}
                <span className="badge bg-black/[0.06] text-ink-700">{ROLE_LABELS[member.role]}</span>
              </div>
            </div>
          ))}
          {memberList.length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-500">Aucun membre.</p>
          ) : null}
        </div>
      </section>

      <p className="text-xs text-ink-500">
        Les invitations expirent après 7 jours. Besoin de revoir les rôles ?{' '}
        <Link href="/dashboard" className="font-semibold underline">
          Retour au tableau de bord
        </Link>
        .
      </p>
    </div>
  );
}
