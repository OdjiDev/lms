import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { requireSession } from '@/lib/session';
import type { CourseDetail, Lesson, MyProgress } from '@/lib/types';
import { toggleLessonAction } from '@/app/actions';
import { ProgressBar } from '@/components/ui';

interface ContentBlock {
  type: string;
  text?: string;
  tone?: string;
  fileUrl?: string;
}

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { courseId } = await params;
  const { lesson: lessonId } = await searchParams;
  await requireSession();

  const [course, progress] = await Promise.all([
    apiSafe<CourseDetail>(`/courses/${courseId}`),
    apiSafe<MyProgress>(`/courses/${courseId}/my-progress`),
  ]);

  if (!course) notFound();
  if (!progress?.enrollment) redirect(`/courses/${courseId}`);

  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  );

  const activeLesson = lessons.find((item) => item.id === lessonId) ?? lessons[0];
  const completed = new Set(progress.completedLessonIds);
  const activeIndex = activeLesson ? lessons.findIndex((item) => item.id === activeLesson.id) : -1;
  const previous = activeIndex > 0 ? lessons[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < lessons.length - 1 ? lessons[activeIndex + 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/courses/${course.id}`}
            className="text-xs font-semibold text-ink-500 hover:text-ink-900"
          >
            ← {course.title}
          </Link>
          <h1 className="mt-1 truncate text-xl font-bold tracking-tight">Espace d’apprentissage</h1>
        </div>
        <div className="flex items-center gap-3 sm:w-64">
          <ProgressBar value={progress.enrollment.progressPct} className="flex-1" />
          <span className="shrink-0 text-xs font-bold text-ink-700">
            {progress.enrollment.progressPct} %
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="card h-fit overflow-hidden">
          <p className="border-b border-black/5 px-4 py-3 text-xs font-bold uppercase tracking-wider text-ink-500">
            Programme
          </p>
          <div className="max-h-[70vh] overflow-y-auto">
            {course.modules.map((module) => (
              <div key={module.id} className="border-b border-black/5 last:border-0">
                <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  {module.title}
                </p>
                <ul>
                  {module.lessons.map((lesson) => {
                    const isActive = lesson.id === activeLesson?.id;
                    const isDone = completed.has(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/learn/${course.id}?lesson=${lesson.id}`}
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition ${
                            isActive
                              ? 'border-l-2 border-brand-500 bg-brand-200/40 font-semibold'
                              : 'border-l-2 border-transparent hover:bg-black/[0.03]'
                          }`}
                        >
                          <span
                            className={`grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                              isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-black/5 text-ink-500'
                            }`}
                          >
                            {isDone ? '✓' : '▸'}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          {activeLesson ? (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="flex aspect-video items-center justify-center bg-ink-950 text-white">
                  {activeLesson.type === 'VIDEO' && activeLesson.videoUrl ? (
                    <video
                      key={activeLesson.id}
                      controls
                      className="size-full"
                      src={activeLesson.videoUrl}
                      poster={course.coverUrl ?? undefined}
                    />
                  ) : (
                    <div className="px-6 text-center">
                      <p className="text-4xl">◐</p>
                      <p className="mt-3 text-sm font-semibold">{activeLesson.title}</p>
                      <p className="mt-1 text-xs text-white/40">
                        {activeLesson.type === 'QUIZ'
                          ? 'Quiz — bientôt disponible'
                          : activeLesson.type === 'FILE'
                            ? 'Ressource téléchargeable'
                            : 'Contenu de la leçon ci-dessous'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-6">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {activeLesson.moduleTitle}
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight">{activeLesson.title}</h2>
                  </div>

                  <LessonBody lesson={activeLesson} />

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
                    <div className="flex gap-2">
                      {previous ? (
                        <Link
                          href={`/learn/${course.id}?lesson=${previous.id}`}
                          className="btn btn-ghost"
                        >
                          ← Précédent
                        </Link>
                      ) : null}
                      {next ? (
                        <Link href={`/learn/${course.id}?lesson=${next.id}`} className="btn btn-ghost">
                          Suivant →
                        </Link>
                      ) : null}
                    </div>

                    <form action={toggleLessonAction}>
                      <input type="hidden" name="lessonId" value={activeLesson.id} />
                      <input type="hidden" name="courseId" value={course.id} />
                      <input
                        type="hidden"
                        name="completed"
                        value={completed.has(activeLesson.id) ? 'false' : 'true'}
                      />
                      <button
                        type="submit"
                        className={completed.has(activeLesson.id) ? 'btn btn-ghost' : 'btn btn-primary'}
                      >
                        {completed.has(activeLesson.id) ? '✓ Terminée — annuler' : 'Marquer comme terminée'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center text-sm text-ink-500">
              Ce cours ne contient pas encore de leçon.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LessonBody({ lesson }: { lesson: Lesson }) {
  const content = lesson.content as { blocks?: ContentBlock[]; fileUrl?: string } | null;

  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink-700">
      {content?.blocks?.map((block, index) => {
        if (block.type === 'callout') {
          return (
            <p
              key={index}
              className="rounded-xl border-l-2 border-brand-500 bg-brand-200/40 px-4 py-3 text-ink-900"
            >
              {block.text}
            </p>
          );
        }
        return <p key={index}>{block.text}</p>;
      })}

      {content?.fileUrl ? (
        <a href={content.fileUrl} className="btn btn-ghost" target="_blank" rel="noreferrer">
          ⬇ Télécharger la ressource
        </a>
      ) : null}

      {!content?.blocks?.length && !content?.fileUrl && !lesson.videoUrl ? (
        <p className="text-ink-500">
          Le contenu de cette leçon n’a pas encore été renseigné par le formateur.
        </p>
      ) : null}
    </div>
  );
}
