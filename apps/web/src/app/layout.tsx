import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Yellow LMS — Plateforme d’apprentissage',
  description:
    'Learning Management System multi-tenant : catalogue, parcours, progression et suivi des apprenants.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
