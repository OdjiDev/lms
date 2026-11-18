import Link from 'next/link';
import { apiSafe } from '@/lib/api';
import { canManage, requireSession } from '@/lib/session';
import type { CourseCard as CourseCardType, Enrollment, OrgStats, Paginated } from '@/lib/types';
import { CourseCard } from '@/components/course-card';
import { EmptyState, ProgressBar, StatCard } from '@/components/ui';

export default async function DashboardPage() {
  const { me, active } = await requireSession();
  const staff = canManage(active.role);

  const [stats, enrollments, courses] = await Promise.all([
    staff ? apiSafe<OrgStats>('/stats') : Promise.resolve(null),
    apiSafe<Enrollment[]>('/me/enrollments'),
    apiSafe<Paginated<CourseCardType>>('/courses?limit=6'),
  ]);

  const myEnrollments = (enrollments ?? []).filter((item) => item.status !== 'CANCELLED');
  const inProgress = myEnrollments.filter((item) => item.status === 'ACTIVE');

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-ink-500">{active.organization.name}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Bonjour {me.firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {staff
            ? 'Voici l’état de votre académie aujourd’hui.'
            : 'Reprenez votre formation là où vous l’avez laissée.'}
        </p>
      </div>

      {staff && stats ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Cours" value={stats.courses} hint={`${stats.publishedCourses} publiés`} />
          <StatCard label="Apprenants" value={stats.learners} hint="membres avec rôle apprenant" />
          <StatCard label="Inscriptions" value={stats.enrollments} hint="toutes sessions confondues" />
          <StatCard
            label="Complétion"
            value={`${stats.completionRate} %`}
            hint={`${stats.completedEnrollments} parcours terminés`}
          />
        </section>
      ) : null}

      {myEnrollments.length > 0 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-lg font-bold tracking-tight">Reprendre l’apprentissage</h2>
            <Link href="/courses" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
              Tout le catalogue →
            </Link>
          </div>
          <div className="grid gap-3">
            {inProgress.slice(0, 4).map((enrollment) => (
              <div key={enrollment.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{enrollment.course.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {enrollment.course._count.modules} modules · {enrollment.course.durationMin} min
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={enrollment.progressPct} className="max-w-xs" />
                    <span className="shrink-0 text-xs font-bold text-ink-700">
                      {enrollment.progressPct} %
                    </span>
                  </div>
                </div>
                <Link href={`/learn/${enrollment.courseId}`} className="btn btn-dark shrink-0">
                  Continuer
                </Link>
              </div>
            ))}
            {inProgress.length === 0 ? (
              <div className="card p-5 text-sm text-ink-500">
                Tous vos parcours sont terminés. Beau travail 🎉
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <EmptyState
          title="Vous n’êtes inscrit à aucun cours pour le moment."
          description="Parcourez le catalogue de votre organisation et inscrivez-vous en un clic."
          actionHref="/courses"
          actionLabel="Découvrir le catalogue"
        />
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-bold tracking-tight">
            {staff ? 'Vos derniers cours' : 'À découvrir'}
          </h2>
          {staff ? (
            <Link href="/courses/new" className="text-sm font-semibold text-ink-500 hover:text-ink-900">
              Créer un cours →
            </Link>
          ) : null}
        </div>
        {courses && courses.items.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.items.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Le catalogue est vide."
            description={
              staff
                ? 'Créez votre premier cours, ajoutez un module et une leçon, puis publiez-le.'
                : 'Votre organisation n’a pas encore publié de cours.'
            }
            actionHref={staff ? '/courses/new' : undefined}
            actionLabel={staff ? 'Créer un cours' : undefined}
          />
        )}
      </section>
    </div>
  );
}
