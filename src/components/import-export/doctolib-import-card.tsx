"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDateTimeFr } from "@/lib/utils";
import { getStatutVisual } from "@/lib/seance-colors";

type PreviewRow = {
  doctolibRef: string;
  date: string;
  patientNom: string;
  patientPrenom: string;
  patientEmail?: string | null;
  dureeMinutes: number;
  statut: string;
};

export function DoctolibImportCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ count: number; rows: PreviewRow[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePreview() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("apply", "false");
      const res = await fetch("/api/import/doctolib", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPreview({ count: data.count, rows: data.rows });
      toast.success(`${data.count} ligne(s) détectée(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de lecture");
    } finally {
      setBusy(false);
    }
  }

  async function handleApply() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("apply", "true");
      const res = await fetch("/api/import/doctolib", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(
        `Import OK — ${data.created} créées · ${data.updated} mises à jour · ${data.patientsCreated} patient(s) créé(s) · ${data.skipped} ignorée(s)`
      );
      setPreview(null);
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'import");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Doctolib (.xlsx)</CardTitle>
        <CardDescription>
          Export XLSX depuis Doctolib (Mes rendez-vous → Exporter). Réconciliation automatique par
          email puis nom/prénom. Les patients inconnus sont créés.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
          <Button onClick={handlePreview} disabled={!file || busy}>
            <Upload className="h-4 w-4" />
            Prévisualiser
          </Button>
        </div>

        {preview && (
          <div className="space-y-3">
            <div className="text-sm font-medium">{preview.count} séance(s) détectée(s)</div>
            <div className="max-h-72 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r) => {
                    const visual = getStatutVisual(r.statut);
                    return (
                      <TableRow key={r.doctolibRef}>
                        <TableCell>{formatDateTimeFr(r.date)}</TableCell>
                        <TableCell>
                          {r.patientPrenom} {r.patientNom}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.patientEmail ?? "—"}
                        </TableCell>
                        <TableCell>{r.dureeMinutes} min</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={visual.badgeClass}>
                            {visual.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <ConfirmDialog
              title="Confirmer l'import ?"
              description={`${preview.count} séance(s) seront créées ou mises à jour. Les patients inconnus seront créés automatiquement.`}
              confirmLabel="Importer"
              trigger={
                <Button disabled={busy}>
                  <CheckCircle2 className="h-4 w-4" />
                  Valider l&apos;import
                </Button>
              }
              onConfirm={handleApply}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
