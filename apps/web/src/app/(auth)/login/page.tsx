import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Content de vous revoir</h1>
      <p className="mt-1 text-sm text-ink-500">Connectez-vous à votre espace de formation.</p>

      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-xl bg-black/5" />}>
        <LoginForm />
      </Suspense>

      <p className="mt-6 text-sm text-ink-500">
        Pas encore de compte ?{' '}
        <Link href="/register" className="font-semibold text-ink-900 underline decoration-brand-500 decoration-2 underline-offset-2">
          Créer un espace
        </Link>
      </p>

      <div className="mt-8 rounded-xl border border-black/5 bg-white p-4 text-xs text-ink-500">
        <p className="font-semibold text-ink-700">Comptes de démonstration</p>
        <p className="mt-1">owner@yellow.academy · formateur@yellow.academy · apprenant@yellow.academy</p>
        <p>Mot de passe : Yellow1234</p>
      </div>
    </div>
  );
}
