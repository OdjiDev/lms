import Link from 'next/link';
import type { CourseStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: CourseStatus }) {
  const map: Record<CourseStatus, { label: string; className: string }> = {
    PUBLISHED: { label: 'Publié', className: 'bg-emerald-100 text-emerald-800' },
    DRAFT: { label: 'Brouillon', className: 'bg-amber-100 text-amber-800' },
    ARCHIVED: { label: 'Archivé', className: 'bg-slate-200 text-slate-600' },
  };
  const { label, className } = map[status];
  return <span className={`badge ${className}`}>{label}</span>;
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-black/10 ${className}`}>
      <div
        className="h-full rounded-full bg-brand-500 transition-[width]"
        style={{ width: `${safe}%` }}
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-brand-200 text-2xl">🟡</div>
      <p className="text-base font-semibold text-ink-900">{title}</p>
      {description ? <p className="max-w-md text-sm text-ink-500">{description}</p> : null}
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary mt-2">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function formatMinutes(total: number): string {
  if (!total) return '—';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes}`;
}
