import Link from "next/link";
import { Bell, AlertTriangle, Mail, Info, Settings } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { RappelRowActions } from "@/components/rappels/rappel-row-actions";
import { listerRappelsEnAttente, type SeanceRappel } from "@/server/rappels.actions";
import { getStatutVisual } from "@/lib/seance-colors";

export const dynamic = "force-dynamic";

function formatDateTime(d: Date): string {
  return new Date(d).toLocaleString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function RappelTable({
  items,
  emptyLabel
}: {
  items: SeanceRappel[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <p className="px-6 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[260px]">Date et heure</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((s) => {
          const visual = getStatutVisual(s.statut);
          return (
            <TableRow key={s.id}>
              <TableCell className="tabular-nums">{formatDateTime(s.date)}</TableCell>
              <TableCell>
                <Link
                  href={`/patients/${s.patientId}`}
                  className="font-medium hover:underline"
                >
                  {s.patientPrenom} {s.patientNom}
                </Link>
                <div className="text-xs text-muted-foreground">{s.dureeMinutes} min</div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {s.patientEmail}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={visual.badgeClass}>
                  {visual.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <RappelRowActions seanceId={s.id} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default async function RappelsPage() {
  const { aEnvoyer, enRetard, rappelsActifs, rappelsHeuresAvant } =
    await listerRappelsEnAttente();

  return (
    <>
      <Topbar title="Rappels de séance" />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {/* Bandeau pédagogique */}
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="space-y-1 text-sm">
            <div className="font-medium">Préparer les rappels des prochaines séances</div>
            <div className="text-muted-foreground">
              Voici les patients à prévenir par email dans les{" "}
              <strong>{rappelsHeuresAvant} prochaines heures</strong>. Cliquez sur «
              Préparer le brouillon » pour ouvrir l&apos;email dans Outlook, puis sur
              « Marquer comme envoyé » pour éviter un doublon.
            </div>
          </div>
        </div>

        {/* Bannière si feature désactivée */}
        {!rappelsActifs && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div>
                <div className="font-medium text-amber-900 dark:text-amber-200">
                  Les rappels automatiques sont désactivés
                </div>
                <div className="mt-1 text-amber-800 dark:text-amber-300">
                  Activez-les dans les paramètres pour faire apparaître un compteur
                  dans la barre latérale et préparer les brouillons.
                </div>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/parametres">
                <Settings className="h-4 w-4" />
                Activer dans Paramètres
              </Link>
            </Button>
          </div>
        )}

        {/* Section : à envoyer maintenant */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-600" />
                <CardTitle>À envoyer maintenant</CardTitle>
              </div>
              <Badge variant="outline">
                {aEnvoyer.length} séance{aEnvoyer.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <CardDescription>
              Séances planifiées dans les {rappelsHeuresAvant} prochaines heures, avec
              un email patient enregistré et aucun rappel déjà envoyé.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <RappelTable
              items={aEnvoyer}
              emptyLabel={
                rappelsActifs
                  ? "Aucune séance à rappeler dans la fenêtre choisie."
                  : "Activez les rappels pour voir la liste."
              }
            />
          </CardContent>
        </Card>

        {/* Section : rattrapage */}
        {enRetard.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle>À rattraper (séances passées non rappelées)</CardTitle>
                </div>
                <Badge variant="destructive">
                  {enRetard.length} séance{enRetard.length > 1 ? "s" : ""}
                </Badge>
              </div>
              <CardDescription>
                Séances qui ont déjà eu lieu ou viennent de passer (dernières 24 h) sans
                avoir reçu de rappel. Pour information ou pour clôturer la trace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <RappelTable
                items={enRetard}
                emptyLabel="Rien à rattraper."
              />
            </CardContent>
          </Card>
        )}

        {/* Bandeau info bas de page */}
        <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            🔒 Aucun email n&apos;est envoyé automatiquement. PsychHub prépare un
            brouillon <code>.eml</code> que vous ouvrez dans votre client mail
            (Outlook, Mail, etc.) — vous validez chaque envoi manuellement.
          </p>
        </div>
      </div>
    </>
  );
}
