'use client';

export function PrintButton({ label = 'Imprimer / Enregistrer en PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn btn-dark" onClick={() => window.print()}>
      ⬇ {label}
    </button>
  );
}
