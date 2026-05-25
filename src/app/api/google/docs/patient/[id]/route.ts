import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { drive as driveApi } from "@googleapis/drive";
import { prisma } from "@/lib/db";
import { getAuthedClient } from "@/lib/google/oauth";
import { buildPatientDocx } from "@/lib/docx/patient-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const config = await prisma.config.findUnique({ where: { id: "default" } });
    if (config?.googleAccessMode === "READ_ONLY") {
      return NextResponse.json(
        { error: "Compte Google en lecture seule. Activez le mode lecture-écriture pour créer un document." },
        { status: 403 }
      );
    }
    const p = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        seances: { orderBy: { date: "desc" } },
        factures: { orderBy: { dateEmission: "desc" } }
      }
    });
    if (!p) return NextResponse.json({ error: "Patient introuvable" }, { status: 404 });

    const docxBuf = await buildPatientDocx(p);
    const auth = await getAuthedClient();
    const drive = driveApi({ version: "v3", auth: auth as never });

    const res = await drive.files.create({
      requestBody: {
        name: `Fiche patient — ${p.prenom} ${p.nom}`,
        mimeType: "application/vnd.google-apps.document"
      },
      media: {
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        body: Readable.from(docxBuf)
      },
      fields: "id, webViewLink"
    });

    return NextResponse.json({
      ok: true,
      id: res.data.id,
      url: res.data.webViewLink
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur création Google Doc" },
      { status: 500 }
    );
  }
}
