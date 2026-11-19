import Link from 'next/link';
import { apiSafe } from '@/lib/api';
import type { PublicCertificate } from '@/lib/types';
import { CheckIcon, CrossIcon } from '@/components/icons';
import { formatMinutes } from '@/components/ui';

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ serial: string }>;
}) {
  const { serial } = await params;
  const certificate = await apiSafe<PublicCertificate>(
    `/certificates/verify/${encodeURIComponent(serial)}`,
  );

  const issued = certificate
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        new Date(certificate.issuedAt),
      )
    : null;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/verify" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
          ← Vérifier un autre certificat
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-ink-500">Yellow LMS</span>
      </div>

      {certificate ? (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 bg-emerald-50 px-6 py-4 text-emerald-800">
            <span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-white">
              <CheckIcon className="size-4" />
            </span>
            <p className="text-sm font-bold">Certificat authentique</p>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Titulaire</p>
              <p className="text-lg font-bold">{certificate.learnerName}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Parcours</p>
              <p className="text-base font-semibold">{certificate.courseTitle}</p>
              <p className="text-sm text-ink-500">
                {formatMinutes(certificate.courseDurationMin)} · {certificate.organizationName}
              </p>
            </div>
            <div className="grid gap-4 border-t border-black/5 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  Délivré le
                </p>
                <p className="text-sm font-semibold">{issued}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
                  Numéro
                </p>
                <p className="font-mono text-sm font-semibold">{certificate.serial}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 bg-red-50 px-6 py-4 text-red-800">
            <span className="grid size-8 place-items-center rounded-full bg-red-600 text-white">
              <CrossIcon className="size-4" />
            </span>
            <p className="text-sm font-bold">Certificat introuvable</p>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-ink-500">
              Aucun certificat ne correspond au numéro{' '}
              <span className="font-mono font-semibold text-ink-900">
                {String(serial).toUpperCase()}
              </span>
              . Vérifiez la saisie : le numéro comporte le préfixe <span className="font-mono">LMS-</span>,
              l’année et 8 caractères.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
