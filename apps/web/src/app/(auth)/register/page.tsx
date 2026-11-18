import Link from 'next/link';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Créer votre académie</h1>
      <p className="mt-1 text-sm text-ink-500">
        Quelques secondes pour lancer votre première formation.
      </p>

      <RegisterForm />

      <p className="mt-6 text-sm text-ink-500">
        Vous avez déjà un compte ?{' '}
        <Link href="/login" className="font-semibold text-ink-900 underline decoration-brand-500 decoration-2 underline-offset-2">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
