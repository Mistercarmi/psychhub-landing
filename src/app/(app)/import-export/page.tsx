import { Suspense } from "react";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/db";
import { ImportExportTabs } from "./import-export-tabs";

export const dynamic = "force-dynamic";

export default async function ImportExportPage() {
  const [config, patients, seances, tags] = await Promise.all([
    prisma.config.findUnique({ where: { id: "default" } }),
    prisma.patient.findMany({
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true }
    }),
    prisma.seance.findMany({
      orderBy: { date: "desc" },
      take: 100,
      select: {
        id: true,
        date: true,
        patient: { select: { nom: true, prenom: true } }
      }
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);

  const mode = config?.googleAccessMode === "READ_ONLY" ? "READ_ONLY" : "READ_WRITE";
  const connected = Boolean(config?.googleRefreshToken);
  const sheetUrl = config?.googleSheetBackupId
    ? `https://docs.google.com/spreadsheets/d/${config.googleSheetBackupId}/edit`
    : null;
  const externalConfigured = Boolean(config?.externalBackupFolder);

  const seancesOpts = seances.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    patientNom: s.patient.nom,
    patientPrenom: s.patient.prenom
  }));

  return (
    <>
      <Topbar title="Importer & Exporter mes données" />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <Suspense>
          <ImportExportTabs
            google={{
              connected,
              email: config?.googleAccountEmail ?? null,
              connectedAt: config?.googleConnectedAt?.toISOString() ?? null,
              mode,
              sheetUrl
            }}
            patients={patients}
            seances={seancesOpts}
            tags={tags}
            externalConfigured={externalConfigured}
          />
        </Suspense>
      </div>
    </>
  );
}
