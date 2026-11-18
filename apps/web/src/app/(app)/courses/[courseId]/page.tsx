import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { canManage, requireSession } from '@/lib/session';
import type { CourseDetail, MyProgress } from '@/lib/types';
import { enrollAction, publishCourseAction } from '@/app/actions';
import { ProgressBar, StatusBadge, formatMinutes } from '@/components/ui';

const TYPE_LABEL: Record<string, string> = {
  VIDEO: 'Vidéo',
  TEXT: 'Lecture',
  QUIZ: 'Quiz',
  FILE: 'Ressource',
};

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId } = await params;
  const { error } = await searchParams;
  const { active } = await requireSession();
  const staff = canManage(active.role);

  const [course, progress] = await Promise.all([
    apiSafe<CourseDetail>(`/courses/${courseId}`),
    apiSafe<MyProgress>(`/courses/${courseId}/my-progress`),
  ]);

  if (!course) notFound();

  const lessons = course.modules.flatMap((module) => module.lessons);
  const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.durationSec, 0);
  const enrollment = progress?.enrollment ?? null;
  const completed = new Set(progress?.completedLessonIds ?? []);

  return (
    <div className="space-y-8">
      <Link href="/courses" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
        ← Catalogue
      </Link>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
      ) : null}

      <header className="card overflow-hidden">
        <div className="relative bg-ink-950 px-6 py-8 text-white sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(245,197,24,0.28),transparent_50%)]" />
          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={course.status} />
              <span className="badge bg-white/10 text-white">{course.level.toLowerCase()}</span>
              <span className="badge bg-white/10 text-white">{course.language.toUpperCase()}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {course.title}
            </h1>
            {course.summary ? (
              <p className="mt-3 text-base leading-relaxed text-white/60">{course.summary}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
              <span>{course.modules.length} modules</span>
              <span>{lessons.length} leçons</span>
              <span>{formatMinutes(course.durationMin || Math.round(totalDuration / 60))}</span>
              <span>{course._count.enrollments} inscrits</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex-1">
            {enrollment ? (
              <div className="max-w-md">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-700">
                  <span>Votre progression</span>
                  <span>{enrollment.progressPct} %</span>
                </div>
                <ProgressBar value={enrollment.progressPct} />
              </div>
            ) : (
              <p className="text-sm text-ink-500">
                {staff ? 'Ce cours est visible par vos apprenants lorsqu’il est publié.' : 'Inscrivez-vous pour démarrer ce parcours.'}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {staff && course.status === 'DRAFT' ? (
              <form action={publishCourseAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <button type="submit" className="btn btn-primary">
                  Publier le cours
                </button>
              </form>
            ) : null}

            {enrollment ? (
              <Link href={`/learn/${course.id}`} className="btn btn-dark">
                {enrollment.progressPct > 0 ? 'Continuer' : 'Commencer'}
              </Link>
            ) : (
              <form action={enrollAction}>
                <input type="hidden" name="courseId" value={course.id} />
                <button type="submit" className="btn btn-dark">
                  S’inscrire au cours
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="text-lg font-bold tracking-tight">Programme</h2>
          {course.modules.length === 0 ? (
            <div className="card mt-4 p-6 text-sm text-ink-500">
              Aucun module pour l’instant.
              {staff ? ' Ajoutez un module puis des leçons pour pouvoir publier le cours.' : ''}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {course.modules.map((module, moduleIndex) => (
                <details key={module.id} className="card overflow-hidden" open={moduleIndex === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm font-bold">
                      <span className="mr-2 text-ink-500">{String(moduleIndex + 1).padStart(2, '0')}</span>
                      {module.title}
                    </span>
                    <span className="shrink-0 text-xs text-ink-500">
                      {module.lessons.length} leçons
                    </span>
                  </summary>
                  <ul className="divide-y divide-black/5 border-t border-black/5">
                    {module.lessons.map((lesson) => {
                      const isDone = completed.has(lesson.id);
                      return (
                        <li key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                              isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-black/5 text-ink-500'
                            }`}
                          >
                            {isDone ? '✓' : '▸'}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{lesson.title}</span>
                          <span className="shrink-0 text-[11px] uppercase tracking-wide text-ink-500">
                            {TYPE_LABEL[lesson.type] ?? lesson.type}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          {course.description ? (
            <div className="card p-5">
              <h2 className="text-sm font-bold">À propos</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-500">
                {course.description}
              </p>
            </div>
          ) : null}

          <div className="card p-5">
            <h2 className="text-sm font-bold">Ce parcours inclut</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-500">
              <li>▤ {course.modules.length} modules structurés</li>
              <li>▸ {lessons.length} leçons</li>
              <li>◔ Suivi de progression automatique</li>
              <li>◫ Accès web et mobile</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
