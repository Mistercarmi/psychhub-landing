import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Cake,
  FileText
} from "lucide-react";

import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { PatientForm } from "@/components/patients/patient-form";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { NotesEditor } from "@/components/patients/notes-editor";
import { PatientHistory } from "@/components/patients/patient-history";
import { PatientExportButton } from "@/components/patients/patient-export-button";
import { DeletePatientButton } from "@/components/patients/delete-patient-button";
import { getPatient } from "@/server/patients.actions";
import { formatDateFr, formatDateTimeFr, formatEuros } from "@/lib/utils";
import { getStatutVisual } from "@/lib/seance-colors";
import {
  factureStatutLabel,
  factureStatutVariant
} from "@/lib/factures/statut-labels";

export const dynamic = "force-dynamic";

/** Calcule l'âge à partir d'une date de naissance. */
function calculerAge(dateNaissance: Date | null | undefined): number | null {
  if (!dateNaissance) return null;
  const now = new Date();
  let age = now.getFullYear() - dateNaissance.getFullYear();
  const m = now.getMonth() - dateNaissance.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dateNaissance.getDate())) {
    age--;
  }
  return age;
}

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const patient = await getPatient(params.id);
  if (!patient) notFound();

  const age = calculerAge(patient.dateNaissance);
  const nbSeancesHonorees = patient.seances.filter((s) => s.statut === "HONOREE").length;
  const nbFacturesImpayees = patient.factures.filter(
    (f) => f.statut === "EMISE" || f.statut === "EN_RETARD"
  ).length;

  return (
    <>
      <Topbar title={`${patient.prenom} ${patient.nom}`} />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patients">
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste des patients
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <PatientForm
              mode="edit"
              initial={{
                id: patient.id,
                nom: patient.nom,
                prenom: patient.prenom,
                dateNaissance: patient.dateNaissance ?? null,
                email: patient.email ?? "",
                telephone: patient.telephone ?? "",
                adresse: patient.adresse ?? "",
                numeroSecu: patient.numeroSecu ?? "",
                motifConsult: patient.motifConsult ?? "",
                notesCliniques: patient.notesCliniques ?? "",
                actif: patient.actif
              }}
              trigger={<Button variant="outline">Modifier la fiche</Button>}
            />
            <PatientExportButton patientId={patient.id} />
            <DeletePatientButton
              id={patient.id}
              label={`${patient.prenom} ${patient.nom}`}
              redirectAfter="/patients"
            />
          </div>
        </div>

        {/* Carte d'en-tête avec récap visuel */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <PatientAvatar
                  prenom={patient.prenom}
                  nom={patient.nom}
                  photoUrl={(patient as { photoUrl?: string | null }).photoUrl}
                  size="lg"
                />
                <div>
                  <CardTitle className="text-2xl">
                    {patient.prenom} {patient.nom}
                  </CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {age !== null && (
                      <span className="inline-flex items-center gap-1">
                        <Cake className="h-3.5 w-3.5" />
                        {age} ans
                      </span>
                    )}
                    {!patient.actif && <Badge variant="outline">Inactif</Badge>}
                  </div>
                  {patient.motifConsult && (
                    <p className="mt-2 max-w-2xl text-sm">
                      <span className="text-muted-foreground">Motif : </span>
                      {patient.motifConsult}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 border-t pt-4 text-sm md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              {patient.email ? (
                <a
                  href={`mailto:${patient.email}`}
                  className="truncate hover:underline"
                  title={patient.email}
                >
                  {patient.email}
                </a>
              ) : (
                <span className="text-muted-foreground">Aucun email</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              {patient.telephone ? (
                <a
                  href={`tel:${patient.telephone}`}
                  className="truncate hover:underline"
                >
                  {patient.telephone}
                </a>
              ) : (
                <span className="text-muted-foreground">Aucun téléphone</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate" title={patient.adresse ?? ""}>
                {patient.adresse || (
                  <span className="text-muted-foreground">Aucune adresse</span>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">
              <FileText className="mr-1 h-3.5 w-3.5" />
              Notes cliniques
            </TabsTrigger>
            <TabsTrigger value="seances">
              Séances ({patient.seances.length})
            </TabsTrigger>
            <TabsTrigger value="factures">
              Factures ({patient.factures.length})
              {nbFacturesImpayees > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">
                  {nbFacturesImpayees}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Journal des modifications</TabsTrigger>
            <TabsTrigger value="info">Informations</TabsTrigger>
          </TabsList>

          <TabsContent value="notes">
            <Card>
              <CardContent className="p-6">
                <NotesEditor
                  patientId={patient.id}
                  initial={{
                    nom: patient.nom,
                    prenom: patient.prenom,
                    email: patient.email,
                    telephone: patient.telephone,
                    adresse: patient.adresse,
                    numeroSecu: patient.numeroSecu,
                    motifConsult: patient.motifConsult,
                    notesCliniques: patient.notesCliniques,
                    actif: patient.actif
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seances">
            <Card>
              {patient.seances.length === 0 ? (
                <div className="space-y-2 py-12 text-center text-sm text-muted-foreground">
                  <CalendarDays className="mx-auto h-8 w-8 opacity-40" />
                  <p>Aucune séance enregistrée pour {patient.prenom}.</p>
                  <p className="text-xs">
                    Créez une séance depuis le calendrier (onglet Séances) ou via
                    l&apos;import Doctolib.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead className="text-right">Tarif</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.seances.map((s) => {
                      const v = getStatutVisual(s.statut);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              {formatDateTimeFr(s.date)}
                            </div>
                          </TableCell>
                          <TableCell>{s.dureeMinutes} min</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatEuros(s.tarif)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={v.badgeClass}>
                              {v.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              {nbSeancesHonorees > 0 && (
                <div className="border-t p-3 text-xs text-muted-foreground">
                  {nbSeancesHonorees} séance{nbSeancesHonorees > 1 ? "s" : ""} honorée
                  {nbSeancesHonorees > 1 ? "s" : ""} au total
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="factures">
            <Card>
              {patient.factures.length === 0 ? (
                <div className="space-y-2 py-12 text-center text-sm text-muted-foreground">
                  <p>Aucune facture émise pour {patient.prenom}.</p>
                  <p className="text-xs">
                    Allez dans l&apos;onglet Factures pour créer une facture à partir
                    de séances honorées.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° de facture</TableHead>
                      <TableHead>Date d&apos;émission</TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                      <TableHead>État</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patient.factures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Link
                            href={`/factures/${f.id}`}
                            className="font-medium hover:underline"
                          >
                            {f.numero}
                          </Link>
                        </TableCell>
                        <TableCell>{formatDateFr(f.dateEmission)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEuros(f.montantTTC)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={factureStatutVariant(f.statut)}>
                            {factureStatutLabel(f.statut)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <PatientHistory patientId={patient.id} />
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardContent className="grid gap-3 p-6 text-sm md:grid-cols-2">
                <Info label="Nom de famille" value={patient.nom} />
                <Info label="Prénom" value={patient.prenom} />
                <Info
                  label="Date de naissance"
                  value={
                    patient.dateNaissance
                      ? `${formatDateFr(patient.dateNaissance)}${age !== null ? ` · ${age} ans` : ""}`
                      : "Non renseignée"
                  }
                />
                <Info
                  label="N° de Sécurité sociale"
                  value={patient.numeroSecu ?? "Non renseigné"}
                />
                <Info
                  label="Fiche créée le"
                  value={formatDateFr(patient.createdAt)}
                />
                <Info
                  label="Dernière modification"
                  value={formatDateFr(patient.updatedAt)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
