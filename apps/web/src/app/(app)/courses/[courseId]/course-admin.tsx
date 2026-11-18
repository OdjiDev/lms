'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addLessonAction,
  addModuleAction,
  archiveCourseAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  updateCourseAction,
  type FormState,
} from '@/app/actions';
import type { CourseDetail, LessonType } from '@/lib/types';

const initialState: FormState = {};

const TYPE_LABEL: Record<LessonType, string> = {
  VIDEO: 'Vidéo',
  TEXT: 'Lecture',
  QUIZ: 'Quiz',
  FILE: 'Ressource',
};

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

function DangerButton({ label, confirmMessage }: { label: string; confirmMessage: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? 'Suppression…' : label}
    </button>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{message}</p>
  );
}

function FormSuccess({ show, label }: { show?: boolean; label: string }) {
  if (!show) return null;
  return <p className="text-xs font-semibold text-emerald-700">{label}</p>;
}

// ── Informations générales ─────────────────────────────────────────────

function CourseInfoForm({ course }: { course: CourseDetail }) {
  const [state, action] = useActionState(updateCourseAction, initialState);

  return (
    <details className="rounded-xl border border-black/10 px-4 py-3">
      <summary className="cursor-pointer text-sm font-bold">Informations du cours</summary>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="courseId" value={course.id} />

        <div>
          <label htmlFor="edit-title" className="label">
            Titre
          </label>
          <input
            id="edit-title"
            name="title"
            required
            minLength={3}
            maxLength={140}
            defaultValue={course.title}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="edit-summary" className="label">
            Accroche
          </label>
          <input
            id="edit-summary"
            name="summary"
            maxLength={280}
            defaultValue={course.summary ?? ''}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="edit-description" className="label">
            Description
          </label>
          <textarea
            id="edit-description"
            name="description"
            rows={4}
            defaultValue={course.description ?? ''}
            className="input resize-y"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="edit-level" className="label">
              Niveau
            </label>
            <select id="edit-level" name="level" defaultValue={course.level} className="input w-48">
              <option value="BEGINNER">Débutant</option>
              <option value="INTERMEDIATE">Intermédiaire</option>
              <option value="ADVANCED">Avancé</option>
            </select>
          </div>
          <div>
            <label htmlFor="edit-duration" className="label">
              Durée (minutes)
            </label>
            <input
              id="edit-duration"
              name="durationMin"
              type="number"
              min={0}
              max={100000}
              defaultValue={course.durationMin}
              className="input w-32"
            />
          </div>
        </div>

        <FormError message={state.error} />
        <FormSuccess show={state.ok} label="Modifications enregistrées." />

        <SubmitButton label="Enregistrer" pendingLabel="Enregistrement…" />
      </form>
    </details>
  );
}

// ── Ajout d'un module ──────────────────────────────────────────────────

function AddModuleForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState(addModuleAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="rounded-xl bg-black/[0.03] p-4">
      <input type="hidden" name="courseId" value={courseId} />
      <label htmlFor={`module-title-${courseId}`} className="label">
        Ajouter un module
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`module-title-${courseId}`}
          name="title"
          required
          minLength={2}
          maxLength={140}
          placeholder="Module 1 — Introduction"
          className="input"
        />
        <SubmitButton label="Ajouter" pendingLabel="Ajout…" />
      </div>
      <div className="mt-2">
        <FormError message={state.error} />
      </div>
    </form>
  );
}

// ── Ajout d'une leçon ──────────────────────────────────────────────────

function AddLessonForm({ courseId, moduleId }: { courseId: string; moduleId: string }) {
  const [state, action] = useActionState(addLessonAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-3 space-y-3 rounded-lg bg-black/[0.03] p-3">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="moduleId" value={moduleId} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="title"
          required
          minLength={2}
          maxLength={160}
          placeholder="Titre de la leçon"
          className="input"
        />
        <select name="type" defaultValue="TEXT" className="input sm:w-40">
          <option value="TEXT">Lecture</option>
          <option value="VIDEO">Vidéo</option>
          <option value="QUIZ">Quiz</option>
          <option value="FILE">Ressource</option>
        </select>
        <input
          name="durationMin"
          type="number"
          min={0}
          max={10000}
          defaultValue={5}
          title="Durée en minutes"
          className="input sm:w-28"
        />
      </div>

      <textarea
        name="content"
        rows={3}
        placeholder="Contenu de la leçon (texte affiché à l’apprenant, optionnel)"
        className="input resize-y"
      />

      <div className="flex items-center gap-3">
        <SubmitButton label="Ajouter la leçon" pendingLabel="Ajout…" />
        <FormError message={state.error} />
      </div>
    </form>
  );
}

// ── Bloc module ────────────────────────────────────────────────────────

function ModuleBlock({
  courseId,
  module,
  index,
}: {
  courseId: string;
  module: CourseDetail['modules'][number];
  index: number;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-bold">
          <span className="mr-2 text-ink-500">{String(index + 1).padStart(2, '0')}</span>
          <span className="break-words">{module.title}</span>
        </p>
        <form action={deleteModuleAction}>
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="moduleId" value={module.id} />
          <DangerButton
            label="Supprimer"
            confirmMessage={`Supprimer le module « ${module.title} » et toutes ses leçons ?`}
          />
        </form>
      </div>

      <ul className="mt-3 divide-y divide-black/5 rounded-lg border border-black/5">
        {module.lessons.length === 0 ? (
          <li className="px-3 py-2 text-xs text-ink-500">Aucune leçon dans ce module.</li>
        ) : (
          module.lessons.map((lesson, lessonIndex) => (
            <li key={lesson.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-5 shrink-0 text-xs text-ink-500">{lessonIndex + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-sm">{lesson.title}</span>
              <span className="badge hidden shrink-0 bg-black/5 text-ink-500 sm:inline-flex">
                {TYPE_LABEL[lesson.type]}
              </span>
              <form action={deleteLessonAction}>
                <input type="hidden" name="courseId" value={courseId} />
                <input type="hidden" name="lessonId" value={lesson.id} />
                <DangerButton
                  label="Supprimer"
                  confirmMessage={`Supprimer la leçon « ${lesson.title} » ?`}
                />
              </form>
            </li>
          ))
        )}
      </ul>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-bold text-ink-700 hover:text-ink-900">
          + Ajouter une leçon
        </summary>
        <AddLessonForm courseId={courseId} moduleId={module.id} />
      </details>
    </div>
  );
}

// ── Zone de danger ─────────────────────────────────────────────────────

function DangerZone({ course, canDelete }: { course: CourseDetail; canDelete: boolean }) {
  return (
    <details className="rounded-xl border border-red-200 px-4 py-3">
      <summary className="cursor-pointer text-sm font-bold text-red-700">Zone de danger</summary>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {course.status !== 'ARCHIVED' ? (
          <form action={archiveCourseAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <SubmitButton
              label="Archiver le cours"
              pendingLabel="Archivage…"
              className="btn btn-ghost"
            />
          </form>
        ) : null}

        {canDelete ? (
          <form action={deleteCourseAction}>
            <input type="hidden" name="courseId" value={course.id} />
            <DangerButton
              label="Supprimer définitivement le cours"
              confirmMessage={`Supprimer définitivement « ${course.title} » ? Cette action est irréversible.`}
            />
          </form>
        ) : (
          <p className="text-xs text-ink-500">
            Seuls le propriétaire et les administrateurs peuvent supprimer un cours.
          </p>
        )}
      </div>
    </details>
  );
}

// ── Panneau complet ────────────────────────────────────────────────────

export function CourseAdmin({
  course,
  canDelete,
}: {
  course: CourseDetail;
  canDelete: boolean;
}) {
  const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 px-6 py-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">
          Administration du cours
        </h2>
        <p className="text-xs text-ink-500">
          {course.modules.length} module{course.modules.length > 1 ? 's' : ''} · {lessonCount} leçon
          {lessonCount > 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-4 px-6 py-5">
        {lessonCount === 0 ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Un cours doit contenir au moins une leçon pour être publié. Créez un module, puis
            ajoutez-y vos leçons.
          </p>
        ) : null}

        <CourseInfoForm course={course} />

        <div className="space-y-3">
          {course.modules.length === 0 ? (
            <p className="text-sm text-ink-500">
              Aucun module pour l’instant : commencez par en créer un ci-dessous.
            </p>
          ) : (
            course.modules.map((module, index) => (
              <ModuleBlock
                key={module.id}
                courseId={course.id}
                module={module}
                index={index}
              />
            ))
          )}
        </div>

        <AddModuleForm courseId={course.id} />

        <DangerZone course={course} canDelete={canDelete} />
      </div>
    </section>
  );
}
