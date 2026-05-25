import { CalendarClock, FileEdit, FilePlus, FileX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeFr } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { getEntityAuditTrail } from "@/server/audit.actions";

const ACTION_META: Record<string, { label: string; color: string; Icon: typeof FilePlus }> = {
  CREATE: { label: "Création", color: "text-emerald-700 dark:text-emerald-400", Icon: FilePlus },
  UPDATE: { label: "Modification", color: "text-amber-700 dark:text-amber-400", Icon: FileEdit },
  DELETE: { label: "Suppression", color: "text-rose-700 dark:text-rose-400", Icon: FileX },
  READ_SENSITIVE: {
    label: "Lecture sensible",
    color: "text-indigo-700 dark:text-indigo-400",
    Icon: FileEdit
  }
};

const FIELD_LABELS: Record<string, string> = {
  nom: "Nom",
  prenom: "Prénom",
  email: "Email",
  telephone: "Téléphone",
  adresse: "Adresse",
  dateNaissance: "Date de naissance",
  numeroSecu: "N° de sécu",
  motifConsult: "Motif consultation",
  notesCliniques: "Notes cliniques",
  actif: "Actif",
  photoUrl: "Photo",
  tagIds: "Tags"
};

function diffFields(
  before: unknown,
  after: unknown
): Array<{ field: string; before: unknown; after: unknown }> {
  if (
    typeof before !== "object" ||
    before === null ||
    typeof after !== "object" ||
    after === null
  ) {
    return [];
  }
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  return keys
    .filter((k) => !["id", "createdAt", "updatedAt"].includes(k))
    .filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
    .map((k) => ({ field: k, before: b[k], after: a[k] }));
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return v.toLocaleString("fr-FR");
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export async function PatientHistory({ patientId }: { patientId: string }) {
  const trail = await getEntityAuditTrail("Patient", patientId, 100);

  if (trail.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <EmptyState
            icon={CalendarClock}
            title="Aucun historique"
            description="Les modifications de cette fiche apparaîtront ici."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <ol className="space-y-3">
          {trail.map((row) => {
            const meta = ACTION_META[row.action] ?? ACTION_META.UPDATE;
            const diffs = row.action === "UPDATE" ? diffFields(row.before, row.after) : [];
            return (
              <li key={row.id} className="border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <meta.Icon className={`h-4 w-4 ${meta.color}`} aria-hidden="true" />
                    <span className="font-medium">{meta.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTimeFr(row.createdAt)}
                  </span>
                </div>
                {diffs.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs">
                    {diffs.map((d) => (
                      <li key={d.field} className="flex flex-wrap items-baseline gap-1.5">
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                          {FIELD_LABELS[d.field] ?? d.field}
                        </Badge>
                        <span className="rounded bg-rose-100 px-1 text-rose-800 line-through dark:bg-rose-950 dark:text-rose-300">
                          {formatValue(d.before)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="rounded bg-emerald-100 px-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {formatValue(d.after)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
