"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Download, FileSignature, Cloud } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type PatientOption = { id: string; nom: string; prenom: string };
type SeanceOption = { id: string; date: string; patientNom: string; patientPrenom: string };

type Props = {
  patients: PatientOption[];
  seances: SeanceOption[];
  googleConnected: boolean;
  googleWritable: boolean;
};

export function WordExportCard({ patients, seances, googleConnected, googleWritable }: Props) {
  const [patientId, setPatientId] = useState<string>("");
  const [seanceId, setSeanceId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
    if (!seanceId && seances[0]) setSeanceId(seances[0].id);
  }, [patients, seances, patientId, seanceId]);

  async function pushToGoogle(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/google/docs/patient/${id}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      const data = await res.json();
      toast.success("Google Doc créé");
      if (data.url) window.open(data.url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export Word — Fiches patient & comptes-rendus
        </CardTitle>
        <CardDescription>
          Génère un document .docx pour un patient (identité, notes, séances, factures) ou pour un
          compte-rendu de séance. Disponible aussi en envoi direct vers Google Docs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Fiche patient</div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Choisir un patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom} {p.prenom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild disabled={!patientId}>
              <a href={patientId ? `/api/export/docx/patient/${patientId}` : "#"}>
                <Download className="h-4 w-4" />
                Télécharger .docx
              </a>
            </Button>
            <Button
              variant="outline"
              disabled={!patientId || !googleConnected || !googleWritable || busy}
              onClick={() => pushToGoogle(patientId)}
              title={
                !googleConnected
                  ? "Connectez Google d'abord"
                  : !googleWritable
                  ? "Mode lecture seule"
                  : ""
              }
            >
              <Cloud className="h-4 w-4" />
              Créer dans Google Docs
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Compte-rendu de séance</div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={seanceId} onValueChange={setSeanceId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Choisir une séance" />
              </SelectTrigger>
              <SelectContent>
                {seances.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleString("fr-FR")} — {s.patientNom} {s.patientPrenom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild disabled={!seanceId}>
              <a href={seanceId ? `/api/export/docx/seance/${seanceId}` : "#"}>
                <FileSignature className="h-4 w-4" />
                Télécharger .docx
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
