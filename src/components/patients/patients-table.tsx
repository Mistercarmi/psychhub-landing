"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PatientAvatar } from "@/components/patients/patient-avatar";
import { PatientForm } from "@/components/patients/patient-form";
import { DeletePatientButton } from "@/components/patients/delete-patient-button";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ResponsiveTable,
  type ResponsiveColumn
} from "@/components/shared/responsive-table";
import type { listPatients } from "@/server/patients.actions";

export type PatientRow = Awaited<ReturnType<typeof listPatients>>[number];

export function PatientsTable({
  rows,
  hasActiveFilters
}: {
  rows: PatientRow[];
  hasActiveFilters: boolean;
}) {
  const columns: ResponsiveColumn<PatientRow>[] = [
    {
      key: "patient",
      label: "Patient",
      sortValue: (p) => `${p.nom} ${p.prenom}`,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <PatientAvatar prenom={p.prenom} nom={p.nom} photoUrl={p.photoUrl} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/patients/${p.id}`}
              className="block truncate font-medium hover:underline"
            >
              {p.prenom} {p.nom}
            </Link>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {p.tags.slice(0, 3).map(({ tag }) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px]"
                  style={tag.color ? { borderColor: tag.color } : undefined}
                >
                  {tag.name}
                </Badge>
              ))}
              {p.tags.length > 3 ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  +{p.tags.length - 3}
                </Badge>
              ) : null}
              {!p.actif ? (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  Inactif
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "contact",
      label: "Contact",
      cell: (p) => (
        <div className="text-sm text-muted-foreground">
          <div className="truncate">{p.email ?? "—"}</div>
          <div className="truncate">{p.telephone ?? "—"}</div>
        </div>
      )
    },
    {
      key: "seances",
      label: "Séances",
      sortValue: (p) => p._count.seances,
      align: "right",
      cell: (p) => p._count.seances
    },
    {
      key: "factures",
      label: "Factures",
      sortValue: (p) => p._count.factures,
      align: "right",
      cell: (p) => p._count.factures
    }
  ];

  return (
    <Card className="p-2 sm:p-4">
      <ResponsiveTable
        rows={rows}
        columns={columns}
        rowKey={(p) => p.id}
        sortable
        defaultSort={{ key: "patient", direction: "asc" }}
        rowAction={(p) => (
          <div className="flex justify-end gap-1">
            <PatientForm
              mode="edit"
              initial={{
                id: p.id,
                nom: p.nom,
                prenom: p.prenom,
                dateNaissance: p.dateNaissance ?? null,
                email: p.email ?? "",
                telephone: p.telephone ?? "",
                adresse: p.adresse ?? "",
                numeroSecu: p.numeroSecu ?? "",
                motifConsult: p.motifConsult ?? "",
                notesCliniques: p.notesCliniques ?? "",
                actif: p.actif
              }}
              trigger={
                <Button variant="ghost" size="sm">
                  Modifier
                </Button>
              }
            />
            <DeletePatientButton id={p.id} label={`${p.prenom} ${p.nom}`} />
          </div>
        )}
        empty={
          <EmptyState
            icon={UserRound}
            title={hasActiveFilters ? "Aucun patient ne correspond" : "Aucun patient pour l'instant"}
            description={
              hasActiveFilters
                ? "Essayez d'effacer les filtres (en haut), ou tapez un autre mot-clé dans la recherche."
                : "Cliquez sur « Ajouter un nouveau patient » en haut à droite pour créer votre première fiche."
            }
          />
        }
      />
    </Card>
  );
}
