import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from "docx";
import type { Patient, Seance, Facture } from "@prisma/client";
import { factureStatutLabel } from "@/lib/factures/statut-labels";
import { SEANCE_STATUT_VISUALS } from "@/lib/seance-colors";
import type { SeanceStatut } from "@/lib/utils";

function seanceStatutLabel(s: string): string {
  return SEANCE_STATUT_VISUALS[s as SeanceStatut]?.label ?? s;
}

type PatientWithRelations = Patient & { seances: Seance[]; factures: Facture[] };

function line(label: string, value: string | null | undefined): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label} : `, bold: true }),
      new TextRun({ text: value ?? "—" })
    ]
  });
}

function formatDateFr(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatDateTimeFr(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR");
}

export async function buildPatientDocx(p: PatientWithRelations): Promise<Buffer> {
  const doc = new Document({
    creator: "PsychHub",
    title: `Fiche patient — ${p.prenom} ${p.nom}`,
    sections: [
      {
        children: [
          new Paragraph({
            text: `Fiche patient — ${p.prenom} ${p.nom}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `Document généré le ${new Date().toLocaleString("fr-FR")}`,
                italics: true,
                size: 18
              })
            ]
          }),
          new Paragraph({ text: "Identité", heading: HeadingLevel.HEADING_2 }),
          line("Nom", p.nom),
          line("Prénom", p.prenom),
          line("Date de naissance", formatDateFr(p.dateNaissance)),
          line("Email", p.email),
          line("Téléphone", p.telephone),
          line("Adresse", p.adresse),
          line("N° Sécurité Sociale", p.numeroSecu),
          line("Actif", p.actif ? "Oui" : "Non"),

          new Paragraph({ text: "Motif de consultation", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: p.motifConsult ?? "—" }),

          new Paragraph({ text: "Notes cliniques", heading: HeadingLevel.HEADING_2 }),
          ...((p.notesCliniques ?? "—").split(/\r?\n/).map((l) => new Paragraph({ text: l }))),

          new Paragraph({
            text: `Séances (${p.seances.length})`,
            heading: HeadingLevel.HEADING_2
          }),
          ...(p.seances.length === 0
            ? [new Paragraph({ text: "Aucune séance enregistrée." })]
            : p.seances.map(
                (s) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `• ${formatDateTimeFr(s.date)} `, bold: true }),
                      new TextRun({
                        text: `— ${s.dureeMinutes} min — ${s.tarif.toFixed(2)} € — ${seanceStatutLabel(s.statut)}`
                      })
                    ]
                  })
              )),

          new Paragraph({
            text: `Factures (${p.factures.length})`,
            heading: HeadingLevel.HEADING_2
          }),
          ...(p.factures.length === 0
            ? [new Paragraph({ text: "Aucune facture émise." })]
            : p.factures.map(
                (f) =>
                  new Paragraph({
                    children: [
                      new TextRun({ text: `• ${f.numero} `, bold: true }),
                      new TextRun({
                        text: `— ${formatDateFr(f.dateEmission)} — ${f.montantTTC.toFixed(2)} € — ${factureStatutLabel(f.statut)}`
                      })
                    ]
                  })
              ))
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}

export async function buildSeanceDocx(
  s: Seance & { patient: Patient }
): Promise<Buffer> {
  const doc = new Document({
    creator: "PsychHub",
    title: `Compte-rendu de séance — ${s.patient.prenom} ${s.patient.nom}`,
    sections: [
      {
        children: [
          new Paragraph({
            text: "Compte-rendu de séance",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
          }),
          line("Patient", `${s.patient.prenom} ${s.patient.nom}`),
          line("Date", formatDateTimeFr(s.date)),
          line("Durée", `${s.dureeMinutes} minutes`),
          line("Tarif", `${s.tarif.toFixed(2)} €`),
          line("Statut", s.statut),
          new Paragraph({ text: "Notes de séance", heading: HeadingLevel.HEADING_2 }),
          ...((s.notesSeance ?? "—").split(/\r?\n/).map((l) => new Paragraph({ text: l })))
        ]
      }
    ]
  });

  return Packer.toBuffer(doc);
}
