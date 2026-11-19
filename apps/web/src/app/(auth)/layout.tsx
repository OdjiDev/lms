import Link from 'next/link';
import { CheckIcon } from '@/components/icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-base font-black text-ink-950">Y</span>
          <span className="text-sm font-bold">Yellow LMS</span>
        </Link>

        <div className="max-w-md">
          <p className="text-3xl font-black leading-tight">
            Former, mesurer,
            <span className="block text-brand-500">recommencer.</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Un catalogue, des parcours, une progression fiable. Vos apprenants retrouvent leur
            formation sur le web et sur mobile — sans divergence de données.
          </p>
        </div>

        <ul className="space-y-2 text-xs text-white/40">
          <li className="flex items-center gap-2">
            <CheckIcon className="size-3.5 text-brand-500" /> Multi-tenant par organisation
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="size-3.5 text-brand-500" /> Rôles : propriétaire, admin, formateur, apprenant
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="size-3.5 text-brand-500" /> API unique pour le web et le mobile
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-500 text-base font-black text-ink-950">Y</span>
            <span className="text-sm font-bold">Yellow LMS</span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
