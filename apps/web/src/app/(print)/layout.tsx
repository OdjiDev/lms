export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-paper px-4 py-8 print:bg-white print:p-0">{children}</div>;
}
