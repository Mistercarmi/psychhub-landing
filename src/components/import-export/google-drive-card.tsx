"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HardDriveDownload, RefreshCw, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
};

export function GoogleDriveCard({ connected }: { connected: boolean }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch("/api/google/drive/list");
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (connected) void refresh();
  }, [connected]);

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDriveDownload className="h-5 w-5" />
            Google Drive — Documents récents
          </CardTitle>
          <CardDescription>
            Connectez votre compte Google pour voir vos derniers Docs et Sheets accessibles.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDriveDownload className="h-5 w-5" />
              Google Drive — Documents récents
            </CardTitle>
            <CardDescription>
              Liste des 20 derniers Google Docs / Sheets de votre Drive.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun document trouvé.
          </div>
        ) : (
          <ul className="divide-y rounded-md border">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {f.mimeType.includes("spreadsheet") ? "SHEET" : "DOC"}
                  </Badge>
                  <span className="truncate">{f.name}</span>
                </div>
                {f.webViewLink && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={f.webViewLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
