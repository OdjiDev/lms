import Link from 'next/link';
import { verifyCertificateAction } from '@/app/actions';

export default function VerifySearchPage() {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
          ← Accueil
        </Link>
        <span className="text-xs font-bold uppercase tracking-widest text-ink-500">Yellow LMS</span>
      </div>

      <div className="card p-8">
        <h1 className="text-2xl font-bold tracking-tight">Vérifier un certificat</h1>
        <p className="mt-2 text-sm text-ink-500">
          Saisissez le numéro figurant en bas de l’attestation. La vérification est publique et ne
          nécessite aucun compte.
        </p>

        <form action={verifyCertificateAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="serial" className="label">
              Numéro de certificat
            </label>
            <input
              id="serial"
              name="serial"
              required
              placeholder="LMS-2026-8F3A2C1D"
              className="input font-mono uppercase"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Vérifier
          </button>
        </form>
      </div>
    </div>
  );
}
