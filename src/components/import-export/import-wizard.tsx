"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, FileUp, Upload, Wand2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TARGET_FIELDS, type TargetEntity } from "@/lib/import/column-mapper";
import { DEDUP_THRESHOLDS, type MatchResult, type PatientCandidate } from "@/lib/import/fuzzy-match";

type Step = "upload" | "detect" | "mapping" | "dedup" | "confirm" | "result";

type SheetSummary = {
  name: string;
  headers: string[];
  sampleRows: Record<string, unknown>[];
  detectedType: "doctolib" | "patients" | "seances" | "factures" | "unknown";
  confidence: number;
  suggestedMapping: Record<string, string>;
};

type AnalyzeResponse = {
  importLogId: string;
  source: "doctolib" | "excel" | "csv" | "gsheets";
  filename?: string;
  spreadsheetTitle?: string;
  sheets: SheetSummary[];
  bestType: string;
  bestConfidence: number;
};

type SheetState = SheetSummary & {
  /** Type cible final (utilisateur peut override). */
  targetEntity: TargetEntity | null;
  /** Mapping final éditable. */
  mapping: Record<string, string>;
  /** Toutes les lignes (utilisées au moment d'apply). */
  allRows: Record<string, unknown>[];
};

type DedupItem = {
  sheetName: string;
  rowIndex: number;
  candidate: PatientCandidate;
  matches: MatchResult[];
  resolution: "create" | "skip" | { action: "merge"; patientId: string };
};

const ENTITY_LABELS: Record<TargetEntity, string> = {
  patients: "Patients",
  seances: "Séances",
  factures: "Factures"
};

const TYPE_LABELS: Record<SheetState["detectedType"], string> = {
  doctolib: "Doctolib",
  patients: "Patients",
  seances: "Séances",
  factures: "Factures",
  unknown: "Inconnu"
};

function detectedToTarget(t: SheetState["detectedType"]): TargetEntity | null {
  if (t === "doctolib" || t === "seances") return "seances";
  if (t === "patients") return "patients";
  if (t === "factures") return "factures";
  return null;
}

export function ImportWizard({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");

  // Analyze state
  const [importLogId, setImportLogId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [sheetsState, setSheetsState] = useState<SheetState[]>([]);

  // Dedup state
  const [dedupItems, setDedupItems] = useState<DedupItem[]>([]);

  // Result state
  const [applyResult, setApplyResult] = useState<{
    patientsCreated: number;
    patientsUpdated: number;
    seancesCreated: number;
    seancesUpdated: number;
    facturesCreated: number;
    facturesUpdated: number;
    conflictsResolved: number;
    rowsSkipped: number;
    errors: string[];
  } | null>(null);

  async function analyzeFile() {
    if (!file && !sheetsUrl) return;
    setBusy(true);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        res = await fetch("/api/import/analyze", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/import/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spreadsheetUrl: sheetsUrl })
        });
      }
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as AnalyzeResponse;
      setImportLogId(data.importLogId);
      setSourceLabel(data.filename ?? data.spreadsheetTitle ?? data.source);

      // Charger lignes complètes : on refait un parse côté client pour les rows (rapide avec le fichier déjà en mémoire).
      // Pour Sheets : on devra appeler l'API analyze qui ne renvoie que 5 lignes — on accepte cette limitation et on re-fetch côté apply.
      // Simplification : on garde les sampleRows + on refetch tout au moment du apply (server side).
      const states: SheetState[] = data.sheets.map((s) => ({
        ...s,
        targetEntity: detectedToTarget(s.detectedType),
        mapping: { ...s.suggestedMapping },
        allRows: s.sampleRows
      }));

      // Pour file local on peut re-parser complet côté client pour disposer de toutes les lignes ; pour gsheets on garde le sample.
      if (file) {
        try {
          const ExcelJS = await import("exceljs");
          const Papa = await import("papaparse");
          if (file.name.toLowerCase().endsWith(".csv")) {
            const text = await file.text();
            const r = Papa.default.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
            if (states.length === 1) states[0].allRows = r.data;
          } else {
            const wb = new ExcelJS.default.Workbook();
            await wb.xlsx.load(await file.arrayBuffer());
            wb.worksheets.forEach((ws) => {
              const headersRow = ws.getRow(1);
              const headers: string[] = [];
              headersRow.eachCell({ includeEmpty: true }, (cell, col) => {
                headers[col - 1] = String((cell.value ?? "") as string).trim();
              });
              const rows: Record<string, unknown>[] = [];
              ws.eachRow({ includeEmpty: false }, (row, idx) => {
                if (idx === 1) return;
                const obj: Record<string, unknown> = {};
                headers.forEach((h, i) => {
                  if (!h) return;
                  obj[h] = row.getCell(i + 1).value;
                });
                if (Object.values(obj).some((v) => v !== null && v !== "")) rows.push(obj);
              });
              const st = states.find((s) => s.name === ws.name);
              if (st) st.allRows = rows;
            });
          }
        } catch {
          // En cas d'échec on garde les sampleRows
        }
      }

      setSheetsState(states);
      setStep("detect");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'analyse");
    } finally {
      setBusy(false);
    }
  }

  async function runDedupCheck() {
    // Pour chaque feuille de type "patients", lancer le check
    const candidates: { sheetName: string; rowIndex: number; candidate: PatientCandidate }[] = [];
    for (const s of sheetsState) {
      if (s.targetEntity !== "patients") continue;
      s.allRows.forEach((row, idx) => {
        const get = (key: string) => {
          const src = Object.entries(s.mapping).find(([, v]) => v === key)?.[0];
          return src ? row[src] : undefined;
        };
        const nom = String(get("nom") ?? "").trim();
        const prenom = String(get("prenom") ?? "").trim();
        if (!nom && !prenom) return;
        candidates.push({
          sheetName: s.name,
          rowIndex: idx,
          candidate: {
            nom,
            prenom,
            email: String(get("email") ?? "") || null,
            dateNaissance: (get("dateNaissance") as string | Date) ?? null
          }
        });
      });
    }

    if (candidates.length === 0) {
      setDedupItems([]);
      setStep("confirm");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/import/dedup-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: candidates.map((c) => c.candidate) })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { matches: { candidateIdx: number; possibleMatches: MatchResult[] }[] };
      const items: DedupItem[] = data.matches
        .filter((m) => m.possibleMatches.length > 0)
        .map((m) => {
          const c = candidates[m.candidateIdx];
          const top = m.possibleMatches[0];
          const auto: DedupItem["resolution"] =
            top.score >= DEDUP_THRESHOLDS.CERTAIN
              ? { action: "merge", patientId: top.patientId }
              : "create";
          return {
            sheetName: c.sheetName,
            rowIndex: c.rowIndex,
            candidate: c.candidate,
            matches: m.possibleMatches,
            resolution: auto
          };
        });
      setDedupItems(items);
      setStep(items.length > 0 ? "dedup" : "confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur dédoublonnage");
    } finally {
      setBusy(false);
    }
  }

  async function applyAll() {
    if (!importLogId) return;
    setBusy(true);
    try {
      // Construire les résolutions par feuille/index
      const resolutionsBySheet = new Map<string, Record<number, { action: "create" } | { action: "merge"; patientId: string } | { action: "skip" }>>();
      for (const item of dedupItems) {
        const map = resolutionsBySheet.get(item.sheetName) ?? {};
        if (item.resolution === "create") map[item.rowIndex] = { action: "create" };
        else if (item.resolution === "skip") map[item.rowIndex] = { action: "skip" };
        else map[item.rowIndex] = { action: "merge", patientId: item.resolution.patientId };
        resolutionsBySheet.set(item.sheetName, map);
      }

      const sheets = sheetsState
        .filter((s) => s.targetEntity !== null)
        .map((s) => ({
          name: s.name,
          detectedType: s.detectedType,
          targetEntity: s.targetEntity!,
          mapping: s.mapping,
          rows: s.allRows,
          resolutions: resolutionsBySheet.get(s.name)
        }));

      const res = await fetch("/api/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importLogId, sheets })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setApplyResult(data.result);
      setStep("result");
      toast.success("Import terminé");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'import");
    } finally {
      setBusy(false);
    }
  }

  function updateSheetTarget(name: string, target: TargetEntity | null) {
    setSheetsState((prev) =>
      prev.map((s) => (s.name === name ? { ...s, targetEntity: target, mapping: target ? s.suggestedMapping : {} } : s))
    );
  }

  function updateMapping(sheetName: string, header: string, value: string) {
    setSheetsState((prev) =>
      prev.map((s) => {
        if (s.name !== sheetName) return s;
        const m = { ...s.mapping };
        if (value === "") delete m[header];
        else m[header] = value;
        return { ...s, mapping: m };
      })
    );
  }

  function resetAll() {
    setStep("upload");
    setFile(null);
    setSheetsUrl("");
    setImportLogId(null);
    setSheetsState([]);
    setDedupItems([]);
    setApplyResult(null);
    setSourceLabel("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Assistant d&apos;import
        </CardTitle>
        <CardDescription>
          5 étapes guidées. Vous pourrez tout vérifier avant que rien ne soit
          enregistré.
        </CardDescription>
        <StepIndicator step={step} />
      </CardHeader>

      <CardContent className="space-y-4">
        {step === "upload" && (
          <UploadStep
            file={file}
            setFile={setFile}
            sheetsUrl={sheetsUrl}
            setSheetsUrl={setSheetsUrl}
          />
        )}

        {step === "detect" && (
          <DetectStep
            sourceLabel={sourceLabel}
            sheetsState={sheetsState}
            onUpdateTarget={updateSheetTarget}
          />
        )}

        {step === "mapping" && (
          <MappingStep sheetsState={sheetsState} onUpdate={updateMapping} />
        )}

        {step === "dedup" && (
          <DedupStep
            items={dedupItems}
            onUpdate={(i, resolution) =>
              setDedupItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, resolution } : it)))
            }
          />
        )}

        {step === "confirm" && (
          <ConfirmStep
            sheetsState={sheetsState}
            dedupItems={dedupItems}
            sourceLabel={sourceLabel}
          />
        )}

        {step === "result" && applyResult && (
          <ResultStep result={applyResult} onReset={resetAll} onClose={onClose} />
        )}

        {step !== "result" && (
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (step === "upload") onClose?.();
                else if (step === "detect") setStep("upload");
                else if (step === "mapping") setStep("detect");
                else if (step === "dedup") setStep("mapping");
                else if (step === "confirm") setStep(dedupItems.length > 0 ? "dedup" : "mapping");
              }}
              disabled={busy}
            >
              <ChevronLeft className="h-4 w-4" />
              {step === "upload" ? "Annuler" : "Précédent"}
            </Button>

            <Button
              onClick={async () => {
                if (step === "upload") await analyzeFile();
                else if (step === "detect") setStep("mapping");
                else if (step === "mapping") await runDedupCheck();
                else if (step === "dedup") setStep("confirm");
                else if (step === "confirm") await applyAll();
              }}
              disabled={
                busy ||
                (step === "upload" && !file && !sheetsUrl) ||
                (step === "detect" && sheetsState.every((s) => s.targetEntity === null))
              }
            >
              {busy
                ? "Patientez…"
                : step === "upload"
                  ? "Analyser le fichier"
                  : step === "detect"
                    ? "Continuer avec les colonnes"
                    : step === "mapping"
                      ? "Vérifier les doublons"
                      : step === "dedup"
                        ? "Voir le récapitulatif"
                        : "Enregistrer dans PsychHub"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- Step indicator -----

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "1. Fichier" },
    { key: "detect", label: "2. Type" },
    { key: "mapping", label: "3. Colonnes" },
    { key: "dedup", label: "4. Doublons" },
    { key: "confirm", label: "5. Vérifier" },
    { key: "result", label: "Terminé" }
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="mt-3 flex items-center gap-1 text-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <span
            className={
              i === idx
                ? "rounded-full bg-primary px-2 py-0.5 text-primary-foreground"
                : i < idx
                  ? "rounded-full bg-muted px-2 py-0.5 text-foreground"
                  : "rounded-full bg-muted/40 px-2 py-0.5 text-muted-foreground"
            }
          >
            {i + 1}. {s.label}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground">›</span>}
        </div>
      ))}
    </div>
  );
}

// ----- Step components -----

function UploadStep({
  file,
  setFile,
  sheetsUrl,
  setSheetsUrl
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  sheetsUrl: string;
  setSheetsUrl: (s: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        D&apos;où viennent vos données ? Choisissez l&apos;une des deux options.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-md border p-4">
          <div className="flex items-center gap-2 font-medium">
            <FileUp className="h-4 w-4" />
            Un fichier sur mon ordinateur
          </div>
          <p className="text-sm text-muted-foreground">
            Excel (.xlsx), CSV, ou un export Doctolib. Glissez-déposez ou cliquez.
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <div className="text-xs text-muted-foreground">
              ✓ Fichier choisi : <span className="font-medium">{file.name}</span>
            </div>
          )}
        </div>
        <div className="space-y-2 rounded-md border p-4">
          <div className="flex items-center gap-2 font-medium">
            <FileSpreadsheet className="h-4 w-4" />
            Un Google Sheet en ligne
          </div>
          <p className="text-sm text-muted-foreground">
            Collez l&apos;adresse complète du Google Sheet (connexion Google requise).
          </p>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/…"
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function DetectStep({
  sourceLabel,
  sheetsState,
  onUpdateTarget
}: {
  sourceLabel: string;
  sheetsState: SheetState[];
  onUpdateTarget: (name: string, target: TargetEntity | null) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">Qu&apos;est-ce qu&apos;on vient d&apos;ouvrir ?</span>
        <span className="text-muted-foreground">
          {" "}
          Vérifiez que le type détecté est correct pour chaque feuille. Si une feuille
          n&apos;a rien à voir, choisissez « Ignorer ».
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Fichier : <span className="font-medium text-foreground">{sourceLabel}</span> ·{" "}
        {sheetsState.length} feuille{sheetsState.length > 1 ? "s" : ""} détectée
        {sheetsState.length > 1 ? "s" : ""}
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feuille</TableHead>
              <TableHead>Type détecté</TableHead>
              <TableHead>Certitude</TableHead>
              <TableHead>Lignes</TableHead>
              <TableHead>À ranger dans</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sheetsState.map((s) => (
              <TableRow key={s.name}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>
                  <Badge variant={s.detectedType === "unknown" ? "outline" : "secondary"}>
                    {TYPE_LABELS[s.detectedType]}
                  </Badge>
                </TableCell>
                <TableCell className="tabular-nums text-xs">{Math.round(s.confidence * 100)}%</TableCell>
                <TableCell className="tabular-nums">{s.allRows.length}</TableCell>
                <TableCell className="w-[180px]">
                  <Select
                    value={s.targetEntity ?? "skip"}
                    onValueChange={(v) =>
                      onUpdateTarget(s.name, v === "skip" ? null : (v as TargetEntity))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">Ignorer cette feuille</SelectItem>
                      <SelectItem value="patients">Patients</SelectItem>
                      <SelectItem value="seances">Séances</SelectItem>
                      <SelectItem value="factures">Factures</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MappingStep({
  sheetsState,
  onUpdate
}: {
  sheetsState: SheetState[];
  onUpdate: (sheetName: string, header: string, value: string) => void;
}) {
  const sheets = sheetsState.filter((s) => s.targetEntity !== null);
  if (sheets.length === 0) {
    return <div className="text-sm text-muted-foreground">Aucune feuille à associer.</div>;
  }
  return (
    <div className="space-y-6">
      <p className="text-sm">
        <span className="font-medium">À quoi correspondent vos colonnes ?</span>
        <span className="text-muted-foreground">
          {" "}
          Pour chaque colonne du fichier, dites à quel champ de PsychHub elle
          correspond. Les correspondances évidentes ont été pré-remplies — ne touchez
          que ce qui n&apos;est pas correct.
        </span>
      </p>
      {sheets.map((s) => (
        <div key={s.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{s.name}</h4>
            <Badge variant="secondary">→ {ENTITY_LABELS[s.targetEntity!]}</Badge>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Colonne dans votre fichier</TableHead>
                  <TableHead>Champ PsychHub correspondant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.headers.map((h) => (
                  <TableRow key={h}>
                    <TableCell className="font-mono text-xs">{h}</TableCell>
                    <TableCell>
                      <Select
                        value={s.mapping[h] ?? "__skip__"}
                        onValueChange={(v) => onUpdate(s.name, h, v === "__skip__" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__skip__">— Ignorer —</SelectItem>
                          {TARGET_FIELDS[s.targetEntity!].map((f) => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

function DedupStep({
  items,
  onUpdate
}: {
  items: DedupItem[];
  onUpdate: (idx: number, resolution: DedupItem["resolution"]) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        ✓ Aucun doublon détecté. Vous pouvez passer à l&apos;étape suivante.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">
          {items.length} patient{items.length > 1 ? "s" : ""} ressemble
          {items.length > 1 ? "nt" : ""} à un patient déjà présent.
        </span>
        <span className="text-muted-foreground">
          {" "}
          Pour chacun, choisissez : fusionner (mettre à jour le patient existant),
          créer un nouveau patient, ou ignorer cette ligne.
        </span>
      </p>
      {items.map((item, idx) => {
        const top = item.matches[0];
        return (
          <div key={`${item.sheetName}-${item.rowIndex}`} className="rounded-md border p-3 text-sm">
            <div className="mb-2 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Nouvelle ligne</div>
                <div className="font-medium">{item.candidate.prenom} {item.candidate.nom}</div>
                <div className="text-xs text-muted-foreground">{item.candidate.email ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Patient existant proposé</div>
                <div className="font-medium">{top.snapshot.prenom} {top.snapshot.nom}</div>
                <div className="text-xs text-muted-foreground">{top.snapshot.email ?? "—"}</div>
                <div className="mt-1 text-xs">
                  <Badge variant={top.score >= DEDUP_THRESHOLDS.CERTAIN ? "default" : "secondary"}>
                    Score {top.score}/100 — {top.reasons.join(" · ")}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Label className="mr-2 self-center">Action :</Label>
              {item.matches.slice(0, 3).map((m) => (
                <Button
                  key={m.patientId}
                  variant={
                    typeof item.resolution === "object" && item.resolution.action === "merge" && item.resolution.patientId === m.patientId
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => onUpdate(idx, { action: "merge", patientId: m.patientId })}
                >
                  Fusionner avec {m.snapshot.prenom} {m.snapshot.nom} ({m.score}%)
                </Button>
              ))}
              <Button
                variant={item.resolution === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => onUpdate(idx, "create")}
              >
                Créer nouveau
              </Button>
              <Button
                variant={item.resolution === "skip" ? "destructive" : "outline"}
                size="sm"
                onClick={() => onUpdate(idx, "skip")}
              >
                Ignorer
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmStep({
  sheetsState,
  dedupItems,
  sourceLabel
}: {
  sheetsState: SheetState[];
  dedupItems: DedupItem[];
  sourceLabel: string;
}) {
  const byTarget: Record<TargetEntity, number> = { patients: 0, seances: 0, factures: 0 };
  for (const s of sheetsState) {
    if (s.targetEntity) byTarget[s.targetEntity] += s.allRows.length;
  }
  const mergeCount = dedupItems.filter((d) => typeof d.resolution === "object" && d.resolution.action === "merge").length;
  const createCount = dedupItems.filter((d) => d.resolution === "create").length;
  const skipCount = dedupItems.filter((d) => d.resolution === "skip").length;

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="font-medium">Récapitulatif avant import.</span>
        <span className="text-muted-foreground">
          {" "}
          Voici ce qui va être enregistré. Rien n&apos;est encore écrit dans
          PsychHub — vous pouvez revenir en arrière.
        </span>
      </p>
      <div className="rounded-md border p-4">
        <div className="text-sm">
          Fichier : <span className="font-medium">{sourceLabel}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Stat label="Patients" value={byTarget.patients} />
          <Stat label="Séances" value={byTarget.seances} />
          <Stat label="Factures" value={byTarget.factures} />
        </div>
      </div>
      {dedupItems.length > 0 && (
        <div className="rounded-md border p-4">
          <div className="text-sm font-medium">Doublons résolus</div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <Badge variant="default">{mergeCount} fusion{mergeCount > 1 ? "s" : ""}</Badge>
            <Badge variant="secondary">
              {createCount} nouveau{createCount > 1 ? "x" : ""}
            </Badge>
            <Badge variant="outline">{skipCount} ignoré{skipCount > 1 ? "s" : ""}</Badge>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        🛡 Chaque modification est enregistrée dans le journal d&apos;activité
        (Paramètres → Audit), vous pourrez toujours revenir en arrière.
      </p>
    </div>
  );
}

function ResultStep({
  result,
  onReset,
  onClose
}: {
  result: NonNullable<ReturnType<typeof useState<{
    patientsCreated: number; patientsUpdated: number; seancesCreated: number;
    seancesUpdated: number; facturesCreated: number; facturesUpdated: number;
    conflictsResolved: number; rowsSkipped: number; errors: string[];
  } | null>>[0]>;
  onReset: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Import terminé</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Patients créés" value={result.patientsCreated} />
        <Stat label="Patients mis à jour" value={result.patientsUpdated} />
        <Stat label="Conflits résolus" value={result.conflictsResolved} />
        <Stat label="Séances créées" value={result.seancesCreated} />
        <Stat label="Séances mises à jour" value={result.seancesUpdated} />
        <Stat label="Ignorées" value={result.rowsSkipped} />
        <Stat label="Factures créées" value={result.facturesCreated} />
        <Stat label="Factures mises à jour" value={result.facturesUpdated} />
      </div>
      {result.errors.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <div className="font-semibold">Erreurs :</div>
          <ul className="ml-4 list-disc">
            {result.errors.map((e, i) => (<li key={i}>{e}</li>))}
          </ul>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onReset}>Nouvel import</Button>
        {onClose && <Button onClick={onClose}>Fermer</Button>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
