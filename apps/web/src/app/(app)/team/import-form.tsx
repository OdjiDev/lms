'use client';

import { useActionState } from 'react';
import { importInvitationsAction, type ImportInvitationsState } from '@/app/actions';
import type { CourseCard } from '@/lib/types';

const initialState: ImportInvitationsState = {};

const ROLES = [
  { value: 'LEARNER', label: 'Apprenant' },
  { value: 'INSTRUCTOR', label: 'Formateur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

export function ImportForm({ courses }: { courses: CourseCard[] }) {
  const [state, action, pending] = useActionState(importInvitationsAction, initialState);
  const result = state.result;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Importer des apprenants (CSV)</h2>
          <p className="mt-1 text-xs text-ink-500">
            Une invitation est envoyée à chaque ligne. Colonnes reconnues : email, prénom, nom,
            rôle. Séparateur virgule ou point-virgule, 200 lignes maximum.
          </p>
        </div>
        <a href="/modele-invitations.csv" download className="btn btn-ghost shrink-0">
          Télécharger le modèle
        </a>
      </div>

      {state.ok && result ? (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-emerald-900">
          <p className="text-sm font-semibold">
            {result.created} invitation{result.created > 1 ? 's' : ''} créée
            {result.created > 1 ? 's' : ''} sur {result.total} ligne{result.total > 1 ? 's' : ''}.
          </p>
          {result.skipped.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {result.skipped.length} ligne{result.skipped.length > 1 ? 's' : ''} ignorée
                {result.skipped.length > 1 ? 's' : ''}
              </p>
              <ul className="mt-1 space-y-1 text-xs">
                {result.skipped.slice(0, 12).map((row) => (
                  <li key={`${row.line}-${row.email}`}>
                    Ligne {row.line}
                    {row.email ? ` (${row.email})` : ''} : {row.reason}
                  </li>
                ))}
              </ul>
              {result.skipped.length > 12 ? (
                <p className="mt-1 text-xs">Et {result.skipped.length - 12} autre(s)…</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <form action={action} className="mt-4 grid gap-4">
        {state.error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {state.error}
          </p>
        ) : null}

        <div>
          <label htmlFor="csv-file" className="label">
            Fichier CSV
          </label>
          <input
            id="csv-file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain"
            required
            className="input py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-black/[0.06] file:px-3 file:py-1.5 file:text-xs file:font-semibold"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="import-role" className="label">
              Rôle par défaut
            </label>
            <select id="import-role" name="role" className="input" defaultValue="LEARNER">
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="import-course" className="label">
              Inscrire à un cours <span className="font-normal text-ink-500">(optionnel)</span>
            </label>
            <select id="import-course" name="courseId" className="input" defaultValue="">
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
          <button type="submit" className="btn btn-dark" disabled={pending}>
            {pending ? 'Import en cours…' : 'Importer et envoyer les invitations'}
          </button>
        </div>
      </form>
    </div>
  );
}
