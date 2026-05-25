import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import {
  buildHumanReadableSnapshot,
  writeHumanReadableSnapshot,
  backupDir
} from "@/lib/backup/local-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Destination = "download" | "local_folder" | "external_folder";

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function logBackup(opts: {
  destination: string;
  filePath?: string;
  externalUrl?: string;
  sizeBytes?: number;
  counts: Record<string, number>;
  status?: "OK" | "FAILED";
  errorMessage?: string;
}) {
  return prisma.backupLog.create({
    data: {
      type: "FULL_SNAPSHOT",
      format: "xlsx",
      destination: opts.destination,
      filePath: opts.filePath ?? null,
      externalUrl: opts.externalUrl ?? null,
      sizeBytes: opts.sizeBytes ?? null,
      counts: JSON.stringify(opts.counts),
      status: opts.status ?? "OK",
      errorMessage: opts.errorMessage ?? null,
      triggeredBy: "manual"
    }
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const destination = (url.searchParams.get("destination") ?? "download") as Destination;

  try {
    if (destination === "download") {
      const wb = await buildHumanReadableSnapshot();
      const counts = await prisma.$transaction([
        prisma.patient.count(),
        prisma.seance.count(),
        prisma.facture.count()
      ]);
      const buffer = await wb.xlsx.writeBuffer();
      const filename = `psychhub-snapshot-${stamp()}.xlsx`;
      await logBackup({
        destination: "download",
        sizeBytes: buffer.byteLength,
        counts: { patients: counts[0], seances: counts[1], factures: counts[2] }
      });
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      });
    }

    if (destination === "local_folder") {
      const res = await writeHumanReadableSnapshot();
      await logBackup({
        destination: "local_folder",
        filePath: res.filePath,
        sizeBytes: res.sizeBytes,
        counts: res.counts
      });
      return NextResponse.json({ ok: true, filename: res.filename, sizeBytes: res.sizeBytes, counts: res.counts });
    }

    if (destination === "external_folder") {
      const config = await prisma.config.findUnique({ where: { id: "default" } });
      const folder = config?.externalBackupFolder;
      if (!folder) {
        return NextResponse.json({ error: "Aucun dossier externe configuré (Paramètres → Sauvegardes)." }, { status: 400 });
      }
      await fs.mkdir(folder, { recursive: true });
      const res = await writeHumanReadableSnapshot(folder);
      await logBackup({
        destination: "external_folder",
        filePath: res.filePath,
        sizeBytes: res.sizeBytes,
        counts: res.counts
      });
      return NextResponse.json({ ok: true, filename: res.filename, filePath: res.filePath, sizeBytes: res.sizeBytes, counts: res.counts });
    }

    return NextResponse.json({ error: "Destination inconnue" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur snapshot";
    await logBackup({
      destination,
      counts: {},
      status: "FAILED",
      errorMessage: message
    }).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // référence anti tree-shaking
    void backupDir;
  }
}
