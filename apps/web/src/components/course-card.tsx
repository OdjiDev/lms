import Link from 'next/link';
import { ProgressBar, StatusBadge, formatMinutes } from '@/components/ui';
import type { CourseCard as CourseCardType } from '@/lib/types';

export function CourseCard({
  course,
  progress,
}: {
  course: CourseCardType;
  progress?: number;
}) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative flex h-36 items-end bg-ink-900 p-4">
        {course.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-70"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,197,24,0.35),transparent_55%)]" />
        )}
        <div className="relative flex w-full items-center justify-between gap-2">
          <span className="badge bg-white/15 text-white backdrop-blur">{course.level.toLowerCase()}</span>
          <StatusBadge status={course.status} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold leading-snug text-ink-900 group-hover:underline group-hover:decoration-brand-500 group-hover:decoration-2 group-hover:underline-offset-2">
          {course.title}
        </h3>
        {course.summary ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{course.summary}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          <span>{course._count.modules} modules</span>
          <span>·</span>
          <span>{formatMinutes(course.durationMin)}</span>
          <span>·</span>
          <span>{course._count.enrollments} inscrits</span>
        </div>

        {typeof progress === 'number' ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-700">
              <span>Progression</span>
              <span>{progress} %</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
