"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Download, FileJson, FileSpreadsheet, FileText, FolderOpen, HardDrive, Cloud, Trash2 } from "lucide-react";

const TABLES = [
  { key: "patients", label: "Patients" },
  { key: "seances", label: "Séances" },
  { key: "factures", label: "Factures" },
  { key: "kpi", label: "KPI synthèse" }
] as const;

const COLUMNS_BY_TABLE: Record<string, { key: string; label: string }[]> = {
  patients: [
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    { key: "dateNaissance", label: "Date de naissance" },
    { key: "email", label: "Email" },
    { key: "telephone", label: "Téléphone" },
    { key: "adresse", label: "Adresse" },
    { key: "numeroSecu", label: "N° Sécu" },
    { key: "motifConsult", label: "Motif" },
    { key: "notesCliniques", label: "Notes" },
    { key: "actif", label: "Actif" },
    { key: "createdAt", label: "Créé le" },
    { key: "id", label: "ID" }
  ],
  seances: [
    { key: "date", label: "Date" },
    { key: "patient", label: "Patient" },
    { key: "dureeMinutes", label: "Durée" },
    { key: "tarif", label: "Tarif" },
    { key: "statut", label: "Statut" },
    { key: "sourceImport", label: "Source" },
    { key: "doctolibRef", label: "Réf Doctolib" },
    { key: "notesSeance", label: "Notes" },
    { key: "id", label: "ID" }
  ],
  factures: [
    { key: "numero", label: "Numéro" },
    { key: "dateEmission", label: "Date émission" },
    { key: "dateEcheance", label: "Date échéance" },
    { key: "patient", label: "Patient" },
    { key: "montantHT", label: "Montant HT" },
    { key: "tva", label: "TVA" },
    { key: "montantTTC", label: "Montant TTC" },
    { key: "statut", label: "Statut" },
    { key: "datePaiement", label: "Payée le" },
    { key: "modePaiement", label: "Mode" },
    { key: "id", label: "ID" }
  ],
  kpi: [
    { key: "indicateur", label: "Indicateur" },
    { key: "valeur", label: "Valeur" },
    { key: "detail", label: "Détail" }
  ]
};

const SEANCE_STATUTS = ["PLANIFIEE", "HONOREE", "ANNULEE_PATIENT", "ANNULEE_PRATICIEN", "ABSENCE"];
const FACTURE_STATUTS = ["BROUILLON", "EMISE", "PAYEE", "EN_RETARD", "ANNULEE"];

type Table = "patients" | "seances" | "factures" | "kpi";
type Format = "xlsx" | "json" | "gsheets";
type Destination = "download" | "local_folder" | "drive" | "external_folder";

type Template = {
  id: string;
  name: string;
  description: string | null;
  format: string;
  scope: {
    tables: Table[];
    filters: Record<string, unknown>;
    columns?: Record<string, string[]>;
    format: string;
    destination: string;
  };
};

export function ExportComposer({
  externalConfigured = false,
  driveConnected = false,
  patients = [],
  tags = []
}: {
  externalConfigured?: boolean;
  driveConnected?: boolean;
  patients?: { id: string; label: string }[];
  tags?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selectedTables, setSelectedTables] = useState<Table[]>(["patients", "seances", "factures"]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusesSeance, setStatusesSeance] = useState<string[]>([]);
  const [statusesFacture, setStatusesFacture] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [patientIds, setPatientIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [format, setFormat] = useState<Format>("xlsx");
  const [destination, setDestination] = useState<Destination>("download");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/export/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.rows ?? []))
      .catch(() => undefined);
  }, []);

  const scope = useMemo(
    () => ({
      tables: selectedTables,
      filters: {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        statusesSeance: statusesSeance.length > 0 ? statusesSeance : undefined,
        statusesFacture: statusesFacture.length > 0 ? statusesFacture : undefined,
        tagIds: tagIds.length > 0 ? tagIds : undefined,
        patientIds: patientIds.length > 0 ? patientIds : undefined
      },
      columns: Object.keys(columns).length > 0 ? columns : undefined,
      format,
      destination
    }),
    [selectedTables, dateFrom, dateTo, statusesSeance, statusesFacture, tagIds, patientIds, columns, format, destination]
  );

  function toggleTable(t: Table) {
    setSelectedTables((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  function toggleStatus(list: string[], setList: (l: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function toggleColumn(table: string, col: string) {
    const current = columns[table] ?? COLUMNS_BY_TABLE[table].map((c) => c.key);
    const next = current.includes(col) ? current.filter((c) => c !== col) : [...current, col];
    setColumns({ ...columns, [table]: next });
  }

  function loadTemplate(tpl: Template) {
    const s = tpl.scope;
    setSelectedTables((s.tables as Table[]) ?? []);
    const f = (s.filters ?? {}) as { dateFrom?: string; dateTo?: string; statusesSeance?: string[]; statusesFacture?: string[]; tagIds?: string[]; patientIds?: string[] };
    setDateFrom(f.dateFrom ?? "");
    setDateTo(f.dateTo ?? "");
    setStatusesSeance(f.statusesSeance ?? []);
    setStatusesFacture(f.statusesFacture ?? []);
    setTagIds(f.tagIds ?? []);
    setPatientIds(f.patientIds ?? []);
    setColumns(s.columns ?? {});
    setFormat((s.format as Format) ?? "xlsx");
    setDestination((s.destination as Destination) ?? "download");
    toast.success(`Template "${tpl.name}" chargé`);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    const res = await fetch(`/api/export/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template supprimé");
    }
  }

  async function run() {
    if (selectedTables.length === 0) {
      toast.error("Sélectionnez au moins une table");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/export/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          templateName: templateName.trim() || undefined
        })
      });
      if (destination === "download") {
        if (!res.ok) throw new Error(await res.text());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disp = res.headers.get("Content-Disposition") ?? "";
        const m = disp.match(/filename="?([^";]+)"?/);
        a.download = m?.[1] ?? "psychhub-export";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export téléchargé");
      } else {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Erreur export");
        }
        const data = await res.json();
        toast.success(data.filename ? `Export écrit : ${data.filename}` : `Export disponible : ${data.url}`);
      }
      if (templateName.trim()) {
        // Refresh templates list
        fetch("/api/export/templates")
          .then((r) => r.json())
          .then((d) => setTemplates(d.rows ?? []))
          .catch(() => undefined);
        setTemplateName("");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choisir précisément ce que j&apos;exporte</CardTitle>
        <CardDescription>
          6 étapes : <strong>quoi</strong>, <strong>quels filtres</strong>,{" "}
          <strong>quelles colonnes</strong>, <strong>quel format</strong>,{" "}
          <strong>où enregistrer</strong>, et optionnellement{" "}
          <strong>sauvegarder vos réglages</strong> pour la prochaine fois.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {templates.length > 0 && (
          <section className="space-y-2">
            <Label>Mes réglages enregistrés (cliquez pour recharger)</Label>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => loadTemplate(t)}
                    className="font-medium hover:underline"
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(t.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <Section title="1. Que voulez-vous exporter ?">
          <div className="flex flex-wrap gap-2">
            {TABLES.map((t) => (
              <ChipToggle
                key={t.key}
                active={selectedTables.includes(t.key)}
                onClick={() => toggleTable(t.key)}
                label={t.label}
              />
            ))}
          </div>
        </Section>

        <Section title="2. Sur quelle période ? (optionnel — laissez vide pour tout exporter)">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>À partir du</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Jusqu&apos;au</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          {selectedTables.includes("seances") && (
            <FilterRow label="Seulement les séances avec ce statut (vide = tous)">
              {SEANCE_STATUTS.map((s) => (
                <ChipToggle
                  key={s}
                  active={statusesSeance.includes(s)}
                  onClick={() => toggleStatus(statusesSeance, setStatusesSeance, s)}
                  label={s.replace(/_/g, " ").toLowerCase()}
                />
              ))}
            </FilterRow>
          )}
          {selectedTables.includes("factures") && (
            <FilterRow label="Seulement les factures avec ce statut (vide = toutes)">
              {FACTURE_STATUTS.map((s) => (
                <ChipToggle
                  key={s}
                  active={statusesFacture.includes(s)}
                  onClick={() => toggleStatus(statusesFacture, setStatusesFacture, s)}
                  label={s.replace(/_/g, " ").toLowerCase()}
                />
              ))}
            </FilterRow>
          )}
          {tags.length > 0 && (
            <FilterRow label="Seulement avec ces étiquettes (vide = toutes)">
              {tags.map((t) => (
                <ChipToggle
                  key={t.id}
                  active={tagIds.includes(t.id)}
                  onClick={() => toggleStatus(tagIds, setTagIds, t.id)}
                  label={t.name}
                />
              ))}
            </FilterRow>
          )}
          {patients.length > 0 && (
            <FilterRow
              label={`Seulement ces patients (${patientIds.length} coché${patientIds.length > 1 ? "s" : ""}, vide = tous)`}
            >
              <div className="max-h-32 w-full overflow-auto rounded-md border p-2 text-xs">
                {patients.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                    <input
                      type="checkbox"
                      checked={patientIds.includes(p.id)}
                      onChange={() => toggleStatus(patientIds, setPatientIds, p.id)}
                      className="h-3 w-3 accent-primary"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </FilterRow>
          )}
        </Section>

        <Section title="3. Quelles colonnes garder dans le fichier ? (toutes cochées par défaut)">
          <div className="space-y-3">
            {selectedTables.map((t) => {
              const cols = COLUMNS_BY_TABLE[t] ?? [];
              const selected = columns[t] ?? cols.map((c) => c.key);
              return (
                <div key={t} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-medium capitalize">{t}</div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setColumns({ ...columns, [t]: cols.map((c) => c.key) })}
                      >
                        Tout
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setColumns({ ...columns, [t]: [] })}
                      >
                        Aucune
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cols.map((c) => (
                      <ChipToggle
                        key={c.key}
                        active={selected.includes(c.key)}
                        onClick={() => toggleColumn(t, c.key)}
                        label={c.label}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="4. Sous quel format de fichier ?">
          <div className="grid gap-2 md:grid-cols-3">
            <FormatCard
              active={format === "xlsx"}
              onClick={() => setFormat("xlsx")}
              icon={<FileSpreadsheet className="h-4 w-4" />}
              title="Excel (.xlsx)"
              desc="Recommandé. Un onglet par type, mise en forme, totaux."
            />
            <FormatCard
              active={format === "gsheets"}
              onClick={() => setFormat("gsheets")}
              icon={<Cloud className="h-4 w-4" />}
              title="Google Sheets"
              desc="Crée un nouveau tableur dans votre Drive."
              disabled={!driveConnected && destination === "drive"}
            />
            <FormatCard
              active={format === "json"}
              onClick={() => setFormat("json")}
              icon={<FileJson className="h-4 w-4" />}
              title="JSON (avancé)"
              desc="Données brutes, pour relecture par un autre logiciel."
            />
          </div>
        </Section>

        <Section title="5. Où enregistrer le fichier ?">
          <div className="grid gap-2 md:grid-cols-2">
            <FormatCard
              active={destination === "download"}
              onClick={() => setDestination("download")}
              icon={<Download className="h-4 w-4" />}
              title="Télécharger sur mon ordinateur"
              desc="Le fichier arrive dans le dossier Téléchargements."
            />
            <FormatCard
              active={destination === "local_folder"}
              onClick={() => setDestination("local_folder")}
              icon={<HardDrive className="h-4 w-4" />}
              title="Dans le dossier Sauvegarde/"
              desc="À côté de PsychHub, fichier horodaté."
            />
            <FormatCard
              active={destination === "drive"}
              onClick={() => driveConnected && setDestination("drive")}
              icon={<Cloud className="h-4 w-4" />}
              title="Sur mon Google Drive"
              desc={driveConnected ? "Nouveau fichier dans votre Drive." : "Connectez Google d'abord (onglet Google)."}
              disabled={!driveConnected}
            />
            <FormatCard
              active={destination === "external_folder"}
              onClick={() => externalConfigured && setDestination("external_folder")}
              icon={<FolderOpen className="h-4 w-4" />}
              title="Dans mon dossier externe"
              desc={
                externalConfigured
                  ? "Le dossier (OneDrive, Dropbox…) configuré dans Paramètres."
                  : "Aucun dossier configuré. Allez dans Paramètres pour en choisir un."
              }
              disabled={!externalConfigured}
            />
          </div>
        </Section>

        <Section title="6. Enregistrer ces réglages pour la prochaine fois ? (facultatif)">
          <div className="flex gap-2">
            <Input
              placeholder="Donnez-lui un nom (ex : Factures payées du mois dernier)"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
        </Section>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Récap : {selectedTables.length} type
            {selectedTables.length > 1 ? "s" : ""} de données · format{" "}
            {format.toUpperCase()} ·{" "}
            {destination === "download"
              ? "téléchargement"
              : destination === "local_folder"
                ? "dossier Sauvegarde/"
                : destination === "drive"
                  ? "Google Drive"
                  : "dossier externe"}
          </div>
          <Button onClick={run} disabled={busy || selectedTables.length === 0}>
            <FileText className="h-4 w-4" />
            {busy ? "Génération en cours…" : "Lancer l'export"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChipToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-0.5 text-xs transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:bg-accent")
      }
    >
      {label}
    </button>
  );
}

function FormatCard({
  active,
  onClick,
  icon,
  title,
  desc,
  disabled = false
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className={
        "flex items-start gap-2 rounded-md border p-3 text-left transition-colors " +
        (active ? "border-primary bg-primary/5" : "border-input hover:bg-accent/40") +
        (disabled ? " cursor-not-allowed opacity-50" : "")
      }
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {active && <Badge variant="default" className="ml-auto self-start">✓</Badge>}
    </button>
  );
}
