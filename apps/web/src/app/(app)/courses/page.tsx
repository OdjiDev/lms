import Link from 'next/link';
import { apiSafe } from '@/lib/api';
import { canManage, requireSession } from '@/lib/session';
import type { CourseCard as CourseCardType, Enrollment, Paginated } from '@/lib/types';
import { CourseCard } from '@/components/course-card';
import { EmptyState, PageHeader } from '@/components/ui';

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;
  const { active } = await requireSession();
  const staff = canManage(active.role);

  const [courses, enrollments] = await Promise.all([
    apiSafe<Paginated<CourseCardType>>(`/courses${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    apiSafe<Enrollment[]>('/me/enrollments'),
  ]);

  const progressByCourse = new Map(
    (enrollments ?? []).map((enrollment) => [enrollment.courseId, enrollment.progressPct]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catalogue"
        subtitle="Tous les parcours disponibles dans votre organisation."
        action={
          staff ? (
            <Link href="/courses/new" className="btn btn-primary">
              ＋ Nouveau cours
            </Link>
          ) : null
        }
      />

      <form action="/courses" className="flex max-w-xl gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search ?? ''}
          placeholder="Rechercher un cours…"
          className="input"
        />
        <button type="submit" className="btn btn-ghost shrink-0">
          Rechercher
        </button>
      </form>

      {courses && courses.items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.items.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={progressByCourse.get(course.id)}
              />
            ))}
          </div>
          <p className="text-xs text-ink-500">
            {courses.total} cours · page {Math.floor(courses.offset / courses.limit) + 1}
          </p>
        </>
      ) : (
        <EmptyState
          title={search ? 'Aucun cours ne correspond à cette recherche.' : 'Aucun cours pour l’instant.'}
          description={staff ? 'Créez un cours, ajoutez du contenu puis publiez-le.' : undefined}
          actionHref={staff ? '/courses/new' : undefined}
          actionLabel={staff ? 'Créer un cours' : undefined}
        />
      )}
    </div>
  );
}
