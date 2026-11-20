import Link from 'next/link';
import { apiSafe } from '@/lib/api';
import type { InvitationPreview } from '@/lib/types';
import { InviteForm } from './invite-form';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await apiSafe<InvitationPreview>(
    `/invitations/${encodeURIComponent(token)}`,
    { token: '', orgId: '' },
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
          ← Accueil
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-ink-500">Yellow LMS</span>
      </div>

      {!preview ? (
        <div className="card p-8">
          <h1 className="text-2xl font-bold tracking-tight">Invitation invalide</h1>
          <p className="mt-2 text-sm text-ink-500">
            Ce lien ne correspond à aucune invitation. Demandez à votre administrateur de vous en
            envoyer une nouvelle.
          </p>
          <Link href="/login" className="btn btn-ghost mt-6">
            Aller à la connexion
          </Link>
        </div>
      ) : preview.status !== 'PENDING' ? (
        <div className="card p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {preview.status === 'EXPIRED' ? 'Invitation expirée' : 'Invitation déjà utilisée'}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            {preview.status === 'EXPIRED'
              ? 'Ce lien a dépassé sa date de validité. Un nouvel envoi est nécessaire.'
              : 'Cette invitation a déjà été acceptée ou annulée.'}
          </p>
          <Link href="/login" className="btn btn-ghost mt-6">
            Se connecter
          </Link>
        </div>
      ) : (
        <div className="card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500">
            {preview.organizationName}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Rejoindre l’organisation</h1>
          <p className="mt-2 text-sm text-ink-500">
            {preview.invitedByName} vous invite avec le rôle{' '}
            <span className="font-semibold text-ink-900">{preview.roleLabel}</span>
            {preview.courseTitle ? (
              <>
                {' '}
                et vous inscrit au parcours{' '}
                <span className="font-semibold text-ink-900">{preview.courseTitle}</span>
              </>
            ) : null}
            .
          </p>
          {preview.needsAccount ? (
            <p className="mt-2 text-xs text-ink-500">
              Invitation destinée à{' '}
              <span className="font-semibold text-ink-900">{preview.email}</span>.
            </p>
          ) : null}

          <InviteForm
            token={token}
            email={preview.email}
            needsAccount={preview.needsAccount}
            firstName={preview.firstName}
            lastName={preview.lastName}
          />
        </div>
      )}
    </div>
  );
}
