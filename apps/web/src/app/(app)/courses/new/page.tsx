import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canManage, requireSession } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { NewCourseForm } from './new-course-form';

export default async function NewCoursePage() {
  const { active } = await requireSession();
  if (!canManage(active.role)) redirect('/courses');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nouveau cours"
        subtitle="Créez la fiche du cours. Vous ajouterez modules et leçons juste après."
      />
      <div className="card p-6">
        <NewCourseForm />
      </div>
      <Link href="/courses" className="inline-block text-sm font-semibold text-ink-500 hover:text-ink-900">
        ← Retour au catalogue
      </Link>
    </div>
  );
}
