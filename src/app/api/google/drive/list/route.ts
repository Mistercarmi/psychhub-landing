import { NextResponse } from "next/server";
import { drive as driveApi } from "@googleapis/drive";
import { getAuthedClient } from "@/lib/google/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getAuthedClient();
    const drive = driveApi({ version: "v3", auth: auth as never });
    const res = await drive.files.list({
      pageSize: 20,
      orderBy: "modifiedTime desc",
      fields: "files(id, name, mimeType, modifiedTime, webViewLink)",
      q: "mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet'"
    });
    return NextResponse.json({ files: res.data.files ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur Drive" },
      { status: 500 }
    );
  }
}
