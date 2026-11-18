'use client';

import { useActionState } from 'react';
import { createCourseAction, type FormState } from '@/app/actions';

const initialState: FormState = {};

export function NewCourseForm() {
  const [state, action, pending] = useActionState(createCourseAction, initialState);

  return (
    <form action={action} className="space-y-5">
      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      ) : null}

      <div>
        <label htmlFor="title" className="label">
          Titre du cours
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={140}
          className="input"
          placeholder="Fondamentaux de la gestion de projet"
        />
      </div>

      <div>
        <label htmlFor="summary" className="label">
          Accroche <span className="font-normal text-ink-500">(280 caractères max)</span>
        </label>
        <input
          id="summary"
          name="summary"
          maxLength={280}
          className="input"
          placeholder="Une phrase qui donne envie de s’inscrire"
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          className="input resize-y"
          placeholder="Objectifs pédagogiques, public visé, prérequis…"
        />
      </div>

      <div>
        <label htmlFor="durationMin" className="label">
          Durée estimée (minutes)
        </label>
        <input
          id="durationMin"
          name="durationMin"
          type="number"
          min={0}
          max={100000}
          defaultValue={60}
          className="input max-w-40"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Création…' : 'Créer le cours'}
      </button>
    </form>
  );
}
