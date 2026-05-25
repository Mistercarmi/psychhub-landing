"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bold, Italic, List, Heading2, Save, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotesViewer } from "@/components/patients/notes-viewer";
import { updatePatient } from "@/server/patients.actions";

export interface NotesEditorProps {
  patientId: string;
  initial: {
    nom: string;
    prenom: string;
    email: string | null;
    telephone: string | null;
    adresse: string | null;
    numeroSecu: string | null;
    motifConsult: string | null;
    notesCliniques: string | null;
    actif: boolean;
  };
}

/**
 * Éditeur markdown léger pour les notes cliniques.
 * Toolbar simple (gras, italique, titre, liste) qui insère la syntaxe markdown
 * à la position du curseur. Onglet "Aperçu" via NotesViewer.
 */
export function NotesEditor({ patientId, initial }: NotesEditorProps) {
  const router = useRouter();
  const [value, setValue] = useState(initial.notesCliniques ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [isPending, startTransition] = useTransition();
  const dirty = (initial.notesCliniques ?? "") !== value;

  function wrap(marker: string, placeholder: string) {
    const ta = document.getElementById(`notes-${patientId}`) as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const selected = value.slice(start, end) || placeholder;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const next = `${before}${marker}${selected}${marker}${after}`;
    setValue(next);
    queueMicrotask(() => {
      ta.focus();
      const newPos = start + marker.length + selected.length + marker.length;
      ta.setSelectionRange(newPos, newPos);
    });
  }

  function prefixLine(prefix: string, placeholder: string) {
    const ta = document.getElementById(`notes-${patientId}`) as HTMLTextAreaElement | null;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const before = value.slice(0, start);
    const after = value.slice(start);
    const needsNewline = before.length > 0 && !before.endsWith("\n");
    const insertion = `${needsNewline ? "\n" : ""}${prefix}${placeholder}`;
    setValue(`${before}${insertion}${after}`);
    queueMicrotask(() => {
      ta.focus();
      const pos = before.length + insertion.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function save() {
    startTransition(async () => {
      try {
        await updatePatient(patientId, {
          nom: initial.nom,
          prenom: initial.prenom,
          email: initial.email ?? "",
          telephone: initial.telephone ?? "",
          adresse: initial.adresse ?? "",
          numeroSecu: initial.numeroSecu ?? "",
          motifConsult: initial.motifConsult ?? "",
          notesCliniques: value,
          actif: initial.actif
        });
        toast.success("Notes enregistrées");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="write">
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Écrire
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="mr-1 h-3.5 w-3.5" />
              Prévisualiser
            </TabsTrigger>
          </TabsList>
          {tab === "write" ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => wrap("**", "texte en gras")}
                aria-label="Mettre en gras"
                title="Mettre en gras (sélectionnez puis cliquez)"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => wrap("*", "texte en italique")}
                aria-label="Mettre en italique"
                title="Mettre en italique (sélectionnez puis cliquez)"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => prefixLine("## ", "Titre de section")}
                aria-label="Ajouter un titre"
                title="Ajouter un titre de section"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => prefixLine("- ", "Premier élément")}
                aria-label="Ajouter une liste à puces"
                title="Ajouter une liste à puces"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>

        <TabsContent value="write">
          <Textarea
            id={`notes-${patientId}`}
            rows={12}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono text-sm"
            placeholder="Vos notes cliniques pour ce patient. Vous pouvez utiliser :
**gras** · *italique* · ## Titre · - liste à puces

Astuce : sélectionnez du texte puis utilisez la barre d'outils en haut à droite pour le mettre en forme rapidement."
          />
          <p className="mt-2 text-xs text-muted-foreground">
            🔒 Ces notes restent sur votre ordinateur. Elles n&apos;apparaissent pas
            dans les factures ni dans les emails envoyés au patient.
          </p>
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-[280px] rounded-md border bg-card/40 p-4">
            {value.trim() ? (
              <NotesViewer content={value} />
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Rien à prévisualiser. Saisissez du texte dans l&apos;onglet « Écrire ».
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
        <p className="text-xs">
          {dirty ? (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              ⚠️ Modifications non enregistrées
            </span>
          ) : (
            <span className="text-emerald-700 dark:text-emerald-400">
              ✓ Notes enregistrées
            </span>
          )}
        </p>
        <Button onClick={save} disabled={isPending || !dirty}>
          <Save className="h-4 w-4" />
          {isPending ? "Enregistrement…" : "Enregistrer les notes"}
        </Button>
      </div>
    </div>
  );
}
