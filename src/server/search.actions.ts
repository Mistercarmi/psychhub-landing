"use server";

import { prisma } from "@/lib/db";

export interface GlobalSearchResult {
  kind: "patient" | "seance" | "facture";
  id: string;
  label: string;
  subtitle?: string;
  href: string;
}

export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [patients, factures, seances] = await Promise.all([
    prisma.patient.findMany({
      where: {
        OR: [
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { email: { contains: q } },
          { telephone: { contains: q } }
        ]
      },
      take: 8,
      orderBy: [{ actif: "desc" }, { nom: "asc" }],
      select: { id: true, nom: true, prenom: true, email: true, actif: true }
    }),
    prisma.facture.findMany({
      where: {
        OR: [
          { numero: { contains: q } },
          { patient: { nom: { contains: q } } },
          { patient: { prenom: { contains: q } } }
        ]
      },
      take: 5,
      orderBy: { dateEmission: "desc" },
      include: { patient: { select: { prenom: true, nom: true } } }
    }),
    prisma.seance.findMany({
      where: {
        OR: [
          { patient: { nom: { contains: q } } },
          { patient: { prenom: { contains: q } } },
          { notesSeance: { contains: q } }
        ]
      },
      take: 5,
      orderBy: { date: "desc" },
      include: { patient: { select: { prenom: true, nom: true } } }
    })
  ]);

  const results: GlobalSearchResult[] = [];
  for (const p of patients) {
    results.push({
      kind: "patient",
      id: p.id,
      label: `${p.prenom} ${p.nom}`,
      subtitle: p.email ?? (p.actif ? "actif" : "inactif"),
      href: `/patients/${p.id}`
    });
  }
  for (const f of factures) {
    results.push({
      kind: "facture",
      id: f.id,
      label: `${f.numero} · ${f.patient.prenom} ${f.patient.nom}`,
      subtitle: f.statut,
      href: `/factures/${f.id}`
    });
  }
  for (const s of seances) {
    results.push({
      kind: "seance",
      id: s.id,
      label: `${s.patient.prenom} ${s.patient.nom}`,
      subtitle: new Date(s.date).toLocaleDateString("fr-FR"),
      href: `/seances`
    });
  }

  return results;
}
