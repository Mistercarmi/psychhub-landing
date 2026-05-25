"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { listAuditLogs, type AuditLogPage, type AuditLogRow } from "@/server/audit.actions";

const ENTITY_LABELS: Record<string, string> = {
  Patient: "Patient",
  Seance: "Séance",
  Facture: "Facture",
  Config: "Configuration",
  Tag: "Étiquette",
  SeanceTemplate: "Modèle de séance",
  Layout: "Layout"
};

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  READ_SENSITIVE: "outline"
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
  READ_SENSITIVE: "Lecture sensible"
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}

export function AuditLogPanel() {
  const [entityType, setEntityType] = useState<string>("ALL");
  const [action, setAction] = useState<string>("ALL");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const params = useMemo(
    () => ({
      entityType,
      action,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: 50
    }),
    [entityType, action, from, to, page]
  );

  useEffect(() => {
    startTransition(async () => {
      const res = await listAuditLogs(params);
      setData(res);
    });
  }, [params]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal d&apos;activité</CardTitle>
        <CardDescription>
          Trace des créations, modifications et suppressions sur la base. Utile en cas d&apos;erreur
          ou pour audit RGPD.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Type d&apos;entité</Label>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Du</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Au</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Date</TableHead>
                <TableHead className="w-[110px]">Entité</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
                <TableHead>Identifiant</TableHead>
                <TableHead className="w-[80px] text-right">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending && !data ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Chargement…</TableCell></TableRow>
              ) : data && data.rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Aucune entrée pour ce filtre.</TableCell></TableRow>
              ) : (
                data?.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                    <TableCell>{ENTITY_LABELS[r.entityType] ?? r.entityType}</TableCell>
                    <TableCell>
                      <Badge variant={ACTION_VARIANTS[r.action] ?? "secondary"}>
                        {ACTION_LABELS[r.action] ?? r.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.entityId ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelected(r)}>Voir</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Page {data.page} / {data.totalPages} — {data.total} entrée{data.total > 1 ? "s" : ""}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Précédente
              </Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                Suivante
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `${ENTITY_LABELS[selected.entityType] ?? selected.entityType} · ${ACTION_LABELS[selected.action] ?? selected.action}` : ""}
            </DialogTitle>
            <DialogDescription>
              {selected ? `${formatDate(selected.createdAt)} — id ${selected.entityId ?? "(sans id)"}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Avant</div>
                <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {selected.before ? JSON.stringify(selected.before, null, 2) : "—"}
                </pre>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Après</div>
                <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {selected.after ? JSON.stringify(selected.after, null, 2) : "—"}
                </pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
