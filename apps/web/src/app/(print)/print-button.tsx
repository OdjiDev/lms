'use client';

import { DownloadIcon } from '@/components/icons';

export function PrintButton({ label = 'Imprimer / Enregistrer en PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-dark" onClick={() => window.print()}>
      <DownloadIcon className="size-4" />
      {label}
    </button>
  );
}
