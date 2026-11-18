import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { apiSafe } from '@/lib/api';
import { canManage, requireSession } from '@/lib/session';
import type { CourseDetail, StaffQuiz } from '@/lib/types';
import { QuizEditor } from './quiz-editor';

export default async function QuizEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { error } = await searchParams;
  const { active } = await requireSession();

  if (!canManage(active.role)) redirect(`/learn/${courseId}`);

  const [course, quiz] = await Promise.all([
    apiSafe<CourseDetail>(`/courses/${courseId}`),
    apiSafe<StaffQuiz | null>(`/lessons/${lessonId}/quiz/edit`),
  ]);

  if (!course) notFound();

  const lesson = course.modules
    .flatMap((module) => module.lessons)
    .find((item) => item.id === lessonId);

  if (!lesson) notFound();
  if (lesson.type !== 'QUIZ') {
    redirect(`/courses/${courseId}?error=${encodeURIComponent('Cette leçon n’est pas un quiz.')}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses/${course.id}`}
          className="text-sm font-semibold text-ink-500 hover:text-ink-900"
        >
          ← {course.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Éditeur de quiz</h1>
        <p className="mt-1 text-sm text-ink-500">
          Les apprenants ne voient jamais les bonnes réponses avant d’avoir répondu.
        </p>
      </div>

      <QuizEditor
        courseId={course.id}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        quiz={quiz}
        initialError={error}
      />
    </div>
  );
}
