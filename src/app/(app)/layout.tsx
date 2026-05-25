import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { compterRappelsEnAttente } from "@/server/rappels.actions";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Tolère un échec (BD verrouillée, etc.) — un compteur absent vaut mieux qu'un layout
  // qui plante.
  let rappelsCount = 0;
  try {
    rappelsCount = await compterRappelsEnAttente();
  } catch {
    rappelsCount = 0;
  }
  return (
    <div className="flex min-h-screen">
      <Sidebar rappelsCount={rappelsCount} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
