import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { composeRequestSchema } from "@/lib/validators/import-export";
import { composeExport, writeComposedExport } from "@/lib/export/compose-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = composeRequestSchema.parse(body);
    const { scope, templateName, templateDescription } = parsed;

    let templateId: string | null = null;
    if (templateName) {
      const tpl = await prisma.exportTemplate.upsert({
        where: { name: templateName },
        update: {
          description: templateDescription ?? null,
          format: scope.format,
          scope: JSON.stringify(scope)
        },
        create: {
          name: templateName,
          description: templateDescription ?? null,
          format: scope.format,
          scope: JSON.stringify(scope)
        }
      });
      templateId = tpl.id;
    }

    // Download direct
    if (scope.destination === "download") {
      const res = await composeExport(scope);
      await prisma.exportLog.create({
        data: {
          format: res.format,
          destination: "download",
          scope: JSON.stringify(scope),
          templateId,
          rowCounts: JSON.stringify(res.counts),
          sizeBytes: res.sizeBytes,
          status: "OK"
        }
      });
      const contentType =
        res.format === "json"
          ? "application/json"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      return new NextResponse(new Uint8Array(res.buffer!), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${res.filename}"`
        }
      });
    }

    // Écriture filesystem
    if (scope.destination === "local_folder" || scope.destination === "external_folder") {
      const res = await writeComposedExport(scope, scope.destination);
      await prisma.exportLog.create({
        data: {
          format: res.format,
          destination: scope.destination,
          scope: JSON.stringify(scope),
          templateId,
          rowCounts: JSON.stringify(res.counts),
          filePath: res.filePath ?? null,
          sizeBytes: res.sizeBytes,
          status: "OK"
        }
      });
      return NextResponse.json({
        ok: true,
        filename: res.filename,
        filePath: res.filePath,
        sizeBytes: res.sizeBytes,
        counts: res.counts
      });
    }

    // Drive : pousse vers Google Sheets en créant un nouveau spreadsheet
    if (scope.destination === "drive") {
      const { exportComposedToDrive } = await import("@/lib/google/drive-export");
      const driveRes = await exportComposedToDrive(scope);
      await prisma.exportLog.create({
        data: {
          format: scope.format,
          destination: "drive",
          scope: JSON.stringify(scope),
          templateId,
          rowCounts: JSON.stringify(driveRes.counts),
          externalUrl: driveRes.url,
          sizeBytes: driveRes.sizeBytes ?? null,
          status: "OK"
        }
      });
      return NextResponse.json({ ok: true, url: driveRes.url, counts: driveRes.counts });
    }

    return NextResponse.json({ error: "Destination inconnue" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur compose";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
