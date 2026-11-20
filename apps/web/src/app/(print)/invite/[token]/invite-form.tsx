'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function InviteForm({
  token,
  email,
  needsAccount,
  firstName,
  lastName,
}: {
  token: string;
  email: string;
  needsAccount: boolean;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');

    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          firstName: form.get('firstName') ?? undefined,
          lastName: form.get('lastName') ?? undefined,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? 'Impossible d’accepter l’invitation.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Serveur injoignable. Réessayez dans un instant.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      {needsAccount ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="label">
              Prénom
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              minLength={2}
              maxLength={60}
              defaultValue={firstName ?? ''}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="label">
              Nom
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              minLength={2}
              maxLength={60}
              defaultValue={lastName ?? ''}
              className="input"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="label">Compte existant</label>
          <p className="rounded-xl bg-black/[0.03] px-4 py-3 text-sm text-ink-700">{email}</p>
          <p className="mt-2 text-xs text-ink-500">
            Saisissez le mot de passe de ce compte pour le rattacher à l’organisation.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="password" className="label">
          {needsAccount ? 'Choisissez un mot de passe' : 'Mot de passe du compte'}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={needsAccount ? 'new-password' : 'current-password'}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="label">
          Confirmation
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete={needsAccount ? 'new-password' : 'current-password'}
          className="input"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? 'Acceptation…' : 'Rejoindre l’organisation'}
      </button>
    </form>
  );
}
