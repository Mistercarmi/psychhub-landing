"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEditorStore } from "../store/editor-store";
import { getModule } from "../registry/module-registry";

interface FieldDescriptor {
  key: string;
  label: string;
  kind: "string" | "longString" | "number" | "boolean" | "enum";
  options?: string[];
  min?: number;
  max?: number;
}

function describeSchema(schema: z.ZodTypeAny): FieldDescriptor[] {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const fields: FieldDescriptor[] = [];
  for (const [key, raw] of Object.entries(shape)) {
    let cur: z.ZodTypeAny = raw;
    while (cur instanceof z.ZodDefault || cur instanceof z.ZodOptional || cur instanceof z.ZodNullable) {
      cur = (cur as any)._def.innerType;
    }

    const label = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());

    if (cur instanceof z.ZodString) {
      const isLong = key.toLowerCase().includes("contenu") || key.toLowerCase().includes("description");
      fields.push({ key, label, kind: isLong ? "longString" : "string" });
    } else if (cur instanceof z.ZodNumber) {
      const checks = (cur as any)._def.checks as Array<{ kind: string; value: number }>;
      const min = checks?.find((c) => c.kind === "min")?.value;
      const max = checks?.find((c) => c.kind === "max")?.value;
      fields.push({ key, label, kind: "number", min, max });
    } else if (cur instanceof z.ZodBoolean) {
      fields.push({ key, label, kind: "boolean" });
    } else if (cur instanceof z.ZodEnum) {
      fields.push({ key, label, kind: "enum", options: (cur as any)._def.values });
    }
  }
  return fields;
}

export function ModuleSettingsDrawer() {
  const isOpen = useEditorStore((s) => s.isSettingsOpen);
  const selectedId = useEditorStore((s) => s.selectedModuleId);
  const layout = useEditorStore((s) => s.layout);
  const closeSettings = useEditorStore((s) => s.closeSettings);
  const updateModuleProps = useEditorStore((s) => s.updateModuleProps);

  const moduleInstance = layout?.modules.find((m) => m.id === selectedId) ?? null;
  const def = moduleInstance ? getModule(moduleInstance.type) : null;

  const fields = useMemo(() => (def ? describeSchema(def.configSchema as z.ZodTypeAny) : []), [def]);

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (moduleInstance) setDraft({ ...moduleInstance.props });
  }, [moduleInstance?.id, moduleInstance?.props, moduleInstance]);

  if (!isOpen || !moduleInstance || !def) return null;

  const handleSave = () => {
    const parsed = (def.configSchema as z.ZodTypeAny).safeParse(draft);
    if (!parsed.success) {
      toast.error("Paramètres invalides", {
        description: parsed.error.issues.map((i) => i.message).join(", ")
      });
      return;
    }
    updateModuleProps(moduleInstance.id, parsed.data as Record<string, unknown>);
    toast.success("Paramètres mis à jour");
    closeSettings();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-96 flex-col border-l bg-card shadow-lg",
        "animate-in slide-in-from-right-4 fade-in"
      )}
      aria-label="Paramètres du module"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="text-sm font-semibold">{def.name}</div>
          <div className="text-xs text-muted-foreground">{def.description}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeSettings}
          aria-label="Fermer les paramètres"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Ce module n&apos;a aucun paramètre configurable.
          </p>
        ) : (
          fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={`settings-${field.key}`}>{field.label}</Label>
              {field.kind === "string" && (
                <Input
                  id={`settings-${field.key}`}
                  value={String(draft[field.key] ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                />
              )}
              {field.kind === "longString" && (
                <Textarea
                  id={`settings-${field.key}`}
                  rows={6}
                  value={String(draft[field.key] ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                />
              )}
              {field.kind === "number" && (
                <Input
                  id={`settings-${field.key}`}
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={Number(draft[field.key] ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field.key]: Number(e.target.value) }))
                  }
                />
              )}
              {field.kind === "boolean" && (
                <input
                  id={`settings-${field.key}`}
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(draft[field.key])}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [field.key]: e.target.checked }))
                  }
                />
              )}
              {field.kind === "enum" && field.options && (
                <Select
                  value={String(draft[field.key] ?? "")}
                  onValueChange={(value) => setDraft((d) => ({ ...d, [field.key]: value }))}
                >
                  <SelectTrigger id={`settings-${field.key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        <Button variant="ghost" onClick={closeSettings}>
          Annuler
        </Button>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Appliquer
        </Button>
      </div>
    </aside>
  );
}
