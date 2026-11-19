'use client';

import { useActionState, useState } from 'react';
import { createInvitationAction, type InviteFormState } from '@/app/actions';
import type { CourseCard } from '@/lib/types';

const initialState: InviteFormState = {};

const ROLES = [
  { value: 'LEARNER', label: 'Apprenant' },
  { value: 'INSTRUCTOR', label: 'Formateur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

export function InviteForm({ courses }: { courses: CourseCard[] }) {
  const [state, action, pending] = useActionState(createInvitationAction, initialState);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!state.acceptUrl) return;
    await navigator.clipboard.writeText(state.acceptUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold">Inviter une personne</h2>
      <p className="mt-1 text-xs text-ink-500">
        Un email contenant un lien personnel est envoyé. En développement, il est capturé par
        Mailpit sur le port 8025.
      </p>

      {state.ok ? (
        <div className="mt-4 space-y-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
          <p className="text-sm font-semibold">Invitation envoyée à {state.email}.</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs">
              {state.acceptUrl}
            </code>
            <button type="button" onClick={copy} className="btn btn-ghost">
              {copied ? 'Copié' : 'Copier le lien'}
            </button>
          </div>
        </div>
      ) : null}

      <form action={action} className="mt-4 grid gap-4">
        {state.error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {state.error}
          </p>
        ) : null}

        <div>
          <label htmlFor="email" className="label">
            Adresse email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={190}
            placeholder="prenom.nom@entreprise.fr"
            className="input"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="role" className="label">
              Rôle
            </label>
            <select id="role" name="role" className="input" defaultValue="LEARNER">
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="courseId" className="label">
              Inscription à un cours <span className="font-normal text-ink-500">(optionnel)</span>
            </label>
            <select id="courseId" name="courseId" className="input" defaultValue="">
              <option value="">Aucune inscription</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                  {course.status !== 'PUBLISHED' ? ' (brouillon)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Envoi…' : 'Envoyer l’invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}
