import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  BookIcon,
  BuildingIcon,
  ChartIcon,
  CheckIcon,
  DevicesIcon,
} from '@/components/icons';

const FEATURES = [
  {
    title: 'Parcours structurés',
    text: 'Modules, leçons, vidéos, textes et fichiers : un programme clair, versionné et publiable en un clic.',
    icon: BookIcon,
  },
  {
    title: 'Progression fiable',
    text: 'La progression est calculée côté serveur, jamais côté client. Reprise exacte à la leçon suivante.',
    icon: ChartIcon,
  },
  {
    title: 'Multi-organisations',
    text: 'Chaque organisation a son catalogue, ses apprenants et ses rôles. Vos données restent cloisonnées.',
    icon: BuildingIcon,
  },
  {
    title: 'Prêt pour le mobile',
    text: 'La même API alimente le web et l’application Expo : un seul domaine métier, deux expériences.',
    icon: DevicesIcon,
  },
];

export default async function LandingPage() {
  const jar = await cookies();
  if (jar.get('lms_rt')) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-base font-black text-ink-950">Y</span>
          <span className="text-sm font-bold">Yellow LMS</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn text-white/70 hover:text-white">
            Se connecter
          </Link>
          <Link href="/register" className="btn btn-primary">
            Créer mon espace
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <span className="badge bg-brand-500/15 text-brand-300">Learning Management System</span>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              Former vos équipes
              <span className="block text-brand-500">sans usine à gaz.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
              Catalogue, parcours, progression, suivi des apprenants. Une plateforme multi-tenant
              pensée pour les organisations qui veulent former vite et bien — sur le web comme sur mobile.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary px-6 py-3 text-base">
                Lancer mon académie
              </Link>
              <Link href="/login" className="btn border border-white/15 px-6 py-3 text-base text-white hover:bg-white/5">
                J’ai déjà un compte
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                ['1 API', 'source de vérité'],
                ['2 clients', 'web + mobile'],
                ['100 %', 'progression serveur'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-xl font-bold text-brand-400">{value}</dt>
                  <dd className="mt-1 text-xs text-white/45">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-brand-500/10 blur-2xl" aria-hidden />
            <div className="relative rounded-3xl border border-white/10 bg-ink-900 p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Mon parcours
                </p>
                <span className="badge bg-emerald-400/15 text-emerald-300">En cours</span>
              </div>
              <div className="pt-4">
                <p className="text-sm font-semibold">Réussir son onboarding</p>
                <p className="mt-1 text-xs text-white/45">Module 2 sur 2 · 4 leçons</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-brand-500" />
                </div>
                <div className="mt-5 space-y-2">
                  {['Comprendre l’écosystème', 'Cartographier les parties prenantes', 'Livrer sa première victoire'].map(
                    (item, index) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                            index < 2 ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {index < 2 ? <CheckIcon className="size-3.5" /> : index + 1}
                        </span>
                        <span className="text-xs text-white/70">{item}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 text-base font-bold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{feature.text}</p>
              </div>
            );
          })}
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/35">
        <p>Yellow LMS · Next.js · NestJS · PostgreSQL · FastAPI</p>
        <p className="mt-2">
          <Link href="/verify" className="underline hover:text-white/60">
            Vérifier un certificat
          </Link>
        </p>
      </footer>
    </div>
  );
}
