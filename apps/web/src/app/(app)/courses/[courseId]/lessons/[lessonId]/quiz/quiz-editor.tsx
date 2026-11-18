'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addQuestionAction,
  deleteQuestionAction,
  deleteQuizAction,
  saveQuizAction,
  type FormState,
} from '@/app/actions';
import type { StaffQuiz } from '@/lib/types';

const initialState: FormState = {};

function SubmitButton({
  label,
  pendingLabel,
  className = 'btn btn-primary',
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function ConfirmSubmit({ label, confirmMessage, className = 'btn btn-ghost' }: {
  label: string;
  confirmMessage: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? 'Suppression…' : label}
    </button>
  );
}

export function QuizEditor({
  courseId,
  lessonId,
  lessonTitle,
  quiz,
  initialError,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  quiz: StaffQuiz | null;
  initialError?: string;
}) {
  const [saveState, saveAction] = useActionState(saveQuizAction, initialState);
  const [questionState, questionAction] = useActionState(addQuestionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (questionState.ok) formRef.current?.reset();
  }, [questionState]);

  const questionCount = quiz?.questions.length ?? 0;

  return (
    <div className="space-y-6">
      {initialError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {initialError}
        </p>
      ) : null}

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold">Paramètres du quiz</h2>
            <p className="mt-1 text-sm text-ink-500">
              Le quiz « {lessonTitle} » valide la leçon lorsqu’il est réussi.
            </p>
          </div>
          <span className="badge bg-black/5 text-ink-500">
            {questionCount} question{questionCount > 1 ? 's' : ''}
          </span>
        </div>

        <form action={saveAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <div>
            <label htmlFor="passingScore" className="label">
              Score de réussite (%)
            </label>
            <input
              id="passingScore"
              name="passingScore"
              type="number"
              min={0}
              max={100}
              defaultValue={quiz?.passingScore ?? 70}
              className="input w-32"
            />
          </div>
          <SubmitButton label="Enregistrer" pendingLabel="Enregistrement…" />
          {saveState.error ? (
            <p className="text-sm font-medium text-red-700">{saveState.error}</p>
          ) : null}
          {saveState.ok ? (
            <p className="text-sm font-semibold text-emerald-700">Enregistré.</p>
          ) : null}
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-sm font-bold">Questions</h2>

        {questionCount === 0 ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Aucune question pour l’instant. Un quiz doit contenir au moins une question pour être
            proposé aux apprenants.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {quiz!.questions.map((question, index) => (
              <li key={question.id} className="rounded-xl border border-black/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">
                    <span className="mr-2 text-ink-500">{index + 1}.</span>
                    {question.prompt}
                  </p>
                  <form action={deleteQuestionAction}>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="lessonId" value={lessonId} />
                    <input type="hidden" name="questionId" value={question.id} />
                    <ConfirmSubmit
                      label="Supprimer"
                      confirmMessage="Supprimer cette question ?"
                      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    />
                  </form>
                </div>

                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {question.options.map((option) => {
                    const correct = option.id === question.correctOptionId;
                    return (
                      <li
                        key={option.id}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                          correct
                            ? 'bg-emerald-50 font-semibold text-emerald-800'
                            : 'bg-black/[0.02] text-ink-700'
                        }`}
                      >
                        <span className="text-xs">{correct ? '✓' : '·'}</span>
                        <span className="min-w-0 flex-1">{option.text}</span>
                      </li>
                    );
                  })}
                </ul>

                {question.explanation ? (
                  <p className="mt-2 text-xs text-ink-500">
                    <span className="font-semibold">Explication :</span> {question.explanation}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card p-6">
        <details open={questionCount === 0}>
          <summary className="cursor-pointer text-sm font-bold">Ajouter une question</summary>

          <form ref={formRef} action={questionAction} className="mt-4 space-y-4">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />

            <div>
              <label htmlFor="prompt" className="label">
                Énoncé
              </label>
              <textarea
                id="prompt"
                name="prompt"
                rows={2}
                required
                minLength={3}
                maxLength={500}
                placeholder="Quel est le premier jour de la période d’onboarding ?"
                className="input resize-y"
              />
            </div>

            <fieldset>
              <legend className="label">
                Propositions <span className="font-normal text-ink-500">(2 minimum, 4 suggérées)</span>
              </legend>
              <div className="space-y-2">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="correctIndex"
                      value={index}
                      defaultChecked={index === 0}
                      aria-label={`Bonne réponse ${index + 1}`}
                      className="size-4 shrink-0 accent-emerald-600"
                    />
                    <input
                      name={`option${index}`}
                      maxLength={300}
                      required={index < 2}
                      placeholder={index < 2 ? `Proposition ${index + 1} (obligatoire)` : `Proposition ${index + 1} (facultatif)`}
                      className="input"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Cochez la pastille de la bonne réponse. Laissez vide les propositions inutiles.
              </p>
            </fieldset>

            <div>
              <label htmlFor="explanation" className="label">
                Explication <span className="font-normal text-ink-500">(facultatif)</span>
              </label>
              <input
                id="explanation"
                name="explanation"
                maxLength={500}
                placeholder="Affichée à l’apprenant après la correction"
                className="input"
              />
            </div>

            {questionState.error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {questionState.error}
              </p>
            ) : null}
            {questionState.ok ? (
              <p className="text-xs font-semibold text-emerald-700">Question ajoutée.</p>
            ) : null}

            <SubmitButton label="Ajouter la question" pendingLabel="Ajout…" />
          </form>
        </details>
      </section>

      {quiz ? (
        <section className="card border-red-200 p-6">
          <h2 className="text-sm font-bold text-red-700">Supprimer le quiz</h2>
          <p className="mt-1 text-sm text-ink-500">
            Les questions et les tentatives seront supprimées. La leçon redeviendra un quiz vide.
          </p>
          <form action={deleteQuizAction} className="mt-4">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <ConfirmSubmit
              label="Supprimer le quiz"
              confirmMessage="Supprimer définitivement ce quiz et toutes ses tentatives ?"
            />
          </form>
        </section>
      ) : null}
    </div>
  );
}
