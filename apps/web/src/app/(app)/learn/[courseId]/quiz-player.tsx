'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitQuizAction, type QuizSubmitState } from '@/app/actions';
import type { LearnerQuiz } from '@/lib/types';

const initialState: QuizSubmitState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={disabled || pending}>
      {pending ? 'Correction…' : 'Valider mes réponses'}
    </button>
  );
}

export function QuizPlayer({
  courseId,
  lessonId,
  data,
}: {
  courseId: string;
  lessonId: string;
  data: LearnerQuiz;
}) {
  const [state, action] = useActionState(submitQuizAction, initialState);
  const quiz = data.quiz;

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="rounded-xl bg-black/[0.03] px-4 py-6 text-sm text-ink-500">
        Ce quiz est en préparation : le formateur n’a pas encore publié de questions.
      </div>
    );
  }

  const result = state.result;
  const questionById = new Map(quiz.questions.map((question) => [question.id, question]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="badge bg-brand-200 text-ink-900">{quiz.questions.length} questions</span>
        <span className="text-ink-500">Réussite à partir de {quiz.passingScore} %</span>
        {data.passed ? (
          <span className="badge bg-emerald-100 text-emerald-800">Réussi</span>
        ) : data.bestScore !== null ? (
          <span className="text-ink-500">Meilleur score : {data.bestScore} %</span>
        ) : null}
      </div>

      {data.passed ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Quiz réussi : la leçon est validée. Vous pouvez le repasser pour améliorer votre score.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </p>
      ) : null}

      {result ? (
        <div
          className={`rounded-xl border px-5 py-4 ${
            result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-2xl font-black tracking-tight">{result.score} %</p>
            <p className="text-sm font-semibold">
              {result.correct}/{result.total} bonnes réponses ·{' '}
              {result.passed ? 'quiz réussi' : `il faut ${result.passingScore} %`}
            </p>
          </div>

          <ul className="mt-4 space-y-2">
            {result.details.map((detail, index) => {
              const question = questionById.get(detail.questionId);
              const given = question?.options.find((option) => option.id === detail.given);
              const correct = question?.options.find(
                (option) => option.id === detail.correctOptionId,
              );

              return (
                <li key={detail.questionId} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                  <p className="font-semibold">
                    <span className={detail.isCorrect ? 'text-emerald-700' : 'text-red-700'}>
                      {detail.isCorrect ? '✓' : '✗'}
                    </span>{' '}
                    {index + 1}. {question?.prompt}
                  </p>
                  {!detail.isCorrect ? (
                    <p className="mt-1 text-xs text-ink-500">
                      Votre réponse : {given?.text ?? 'aucune'} — bonne réponse :{' '}
                      <span className="font-semibold text-emerald-700">{correct?.text}</span>
                    </p>
                  ) : null}
                  {detail.explanation ? (
                    <p className="mt-1 text-xs text-ink-500">{detail.explanation}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lessonId} />

        {quiz.questions.map((question, index) => (
          <fieldset key={question.id} className="rounded-xl border border-black/10 p-4">
            <legend className="px-1 text-sm font-semibold">
              <span className="mr-2 text-ink-500">{index + 1}.</span>
              {question.prompt}
            </legend>
            <div className="mt-2 space-y-1.5">
              {question.options.map((option) => {
                const correction = result?.details.find(
                  (detail) => detail.questionId === question.id,
                );
                const isCorrectOption = correction?.correctOptionId === option.id;
                const wasGiven = correction?.given === option.id;

                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      isCorrectOption
                        ? 'bg-emerald-50 font-semibold text-emerald-800'
                        : wasGiven && correction && !correction.isCorrect
                          ? 'bg-red-50 text-red-800'
                          : 'hover:bg-black/[0.03]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`answer_${question.id}`}
                      value={option.id}
                      required
                      className="size-4 shrink-0 accent-emerald-600"
                    />
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        {data.canAttempt ? (
          <SubmitButton disabled={false} />
        ) : (
          <p className="text-sm text-ink-500">
            Inscrivez-vous au cours pour passer ce quiz.
          </p>
        )}
      </form>
    </div>
  );
}
