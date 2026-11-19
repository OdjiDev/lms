import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { requireSession } from '@/lib/session';
import type { Certificate } from '@/lib/types';
import { AwardIcon } from '@/components/icons';
import { formatMinutes } from '@/components/ui';
import { PrintButton } from '../../print-button';

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession();

  const certificate = await apiSafe<Certificate>(`/certificates/${id}`);
  if (!certificate) notFound();

  const issued = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(certificate.issuedAt));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const verifyPath = `/verify/${certificate.serial}`;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
          ← Tableau de bord
        </Link>
        <PrintButton />
      </div>

      <article className="relative overflow-hidden border-[10px] border-brand-500 bg-white px-8 py-12 text-center shadow-xl sm:px-14 sm:py-16 print:border-8 print:shadow-none">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(245,197,24,0.16),transparent_60%)]" />

        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-ink-500">
            {certificate.organization.name}
          </p>

          <div className="mx-auto mt-6 grid size-16 place-items-center rounded-full bg-brand-500 text-ink-950">
            <AwardIcon className="size-8" />
          </div>

          <h1 className="mt-6 text-sm font-bold uppercase tracking-[0.35em] text-ink-700">
            Certificat de réussite
          </h1>

          <p className="mt-8 text-sm text-ink-500">décerné à</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
            {certificate.user.firstName} {certificate.user.lastName}
          </p>

          <p className="mt-6 text-sm text-ink-500">
            pour avoir suivi et terminé avec succès le parcours
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-xl font-bold leading-snug tracking-tight text-ink-900 sm:text-2xl">
            {certificate.course.title}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-ink-500">
            <span>Durée : {formatMinutes(certificate.course.durationMin)}</span>
            <span>Délivré le {issued}</span>
          </div>

          <div className="mt-12 flex flex-col items-center gap-6 border-t border-black/10 pt-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Numéro de certificat
              </p>
              <p className="font-mono text-sm font-semibold">{certificate.serial}</p>
            </div>

            <div className="w-44 border-t border-ink-700 pt-1">
              <p className="text-[10px] uppercase tracking-wider text-ink-500">
                Pour {certificate.organization.name}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
                Vérification publique
              </p>
              <p className="font-mono text-xs">{appUrl ? `${appUrl}${verifyPath}` : verifyPath}</p>
            </div>
          </div>
        </div>
      </article>

      <p className="no-print mt-4 text-center text-xs text-ink-500">
        Utilisez « Imprimer / Enregistrer en PDF » puis choisissez « Enregistrer au format PDF ».
        Ce certificat est vérifiable publiquement à l’adresse {verifyPath}.
      </p>
    </div>
  );
}
