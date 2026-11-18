'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const body = {
      organizationName: String(data.get('organizationName') ?? ''),
      firstName: String(data.get('firstName') ?? ''),
      lastName: String(data.get('lastName') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    };

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setError(payload.message ?? 'Création impossible');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      <div>
        <label htmlFor="organizationName" className="label">
          Nom de l’organisation
        </label>
        <input
          id="organizationName"
          name="organizationName"
          required
          minLength={2}
          className="input"
          placeholder="Yellow Academy"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="label">
            Prénom
          </label>
          <input id="firstName" name="firstName" required className="input" placeholder="Awa" />
        </div>
        <div>
          <label htmlFor="lastName" className="label">
            Nom
          </label>
          <input id="lastName" name="lastName" required className="input" placeholder="Diallo" />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="label">
          Adresse email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="input"
          placeholder="vous@organisation.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="input"
          placeholder="8 caractères minimum, 1 lettre et 1 chiffre"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full py-3" disabled={loading}>
        {loading ? 'Création…' : 'Créer mon espace'}
      </button>
    </form>
  );
}
