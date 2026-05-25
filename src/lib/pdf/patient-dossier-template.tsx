import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Patient, Seance, Facture, Config } from "@prisma/client";
import { factureStatutLabel } from "@/lib/factures/statut-labels";
import { SEANCE_STATUT_VISUALS } from "@/lib/seance-colors";
import type { SeanceStatut } from "@/lib/utils";

function seanceStatutLabel(s: string): string {
  return SEANCE_STATUT_VISUALS[s as SeanceStatut]?.label ?? s;
}

const DEFAULT_PRIMARY = "#1f2933";

function makeStyles(primary: string) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2933" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    headerLeft: { flexDirection: "row", gap: 12 },
    logo: { width: 48, height: 48, objectFit: "contain", marginRight: 8 },
    cabinet: { fontSize: 12, fontWeight: 700, color: primary },
    meta: { textAlign: "right", fontSize: 9, color: "#52606d" },
    title: { fontSize: 20, fontWeight: 700, color: primary, marginBottom: 4 },
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      color: primary,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd2d9",
      paddingBottom: 3,
      marginBottom: 6
    },
    sectionLabel: { fontSize: 9, color: "#9aa5b1", textTransform: "uppercase", marginBottom: 2 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    field: { width: "50%", marginBottom: 8, paddingRight: 8 },
    fieldLabel: { fontSize: 8, color: "#9aa5b1", textTransform: "uppercase", marginBottom: 1 },
    fieldValue: { fontSize: 10 },
    notes: { fontSize: 10, lineHeight: 1.5 },
    table: { marginTop: 6 },
    th: { flexDirection: "row", paddingVertical: 4, backgroundColor: "#f5f7fa", fontSize: 9 },
    tr: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e4e7eb",
      paddingVertical: 4,
      fontSize: 9
    },
    colDate: { width: "30%", paddingHorizontal: 4 },
    colMid: { width: "20%", paddingHorizontal: 4 },
    colMidR: { width: "20%", paddingHorizontal: 4, textAlign: "right" },
    colStatut: { width: "30%", paddingHorizontal: 4 },
    confidential: {
      marginTop: 12,
      padding: 6,
      backgroundColor: "#fef3c7",
      borderRadius: 3,
      fontSize: 8,
      color: "#92400e"
    },
    footer: {
      position: "absolute",
      bottom: 32,
      left: 40,
      right: 40,
      fontSize: 8,
      color: "#9aa5b1",
      textAlign: "center"
    }
  });
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function fmtEuros(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const styles = makeStyles(DEFAULT_PRIMARY);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value && value.trim() !== "" ? value : "—"}</Text>
    </View>
  );
}

export function PatientDossierDocument({
  patient,
  seances,
  factures,
  config
}: {
  patient: Patient;
  seances: Seance[];
  factures: Facture[];
  config: Config | null;
}) {
  const cfg = config as
    | (Config & {
        logoBase64?: string | null;
        couleurPrimaire?: string | null;
      })
    | null;
  const primary = cfg?.couleurPrimaire?.trim() || DEFAULT_PRIMARY;
  const styles = makeStyles(primary);

  const totalSeances = seances.length;
  const honorees = seances.filter((s) => s.statut === "HONOREE").length;
  const annulees = seances.filter((s) =>
    ["ANNULEE_PATIENT", "ANNULEE_PRATICIEN", "ABSENCE"].includes(s.statut)
  ).length;
  const caTotal = seances
    .filter((s) => s.statut === "HONOREE")
    .reduce((acc, s) => acc + s.tarif, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {cfg?.logoBase64 ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image vient de @react-pdf/renderer (PDF), pas du DOM HTML
              <Image src={cfg.logoBase64} style={styles.logo} />
            ) : null}
            <View>
              <Text style={styles.cabinet}>{config?.cabinetNom ?? "Cabinet de Psychologie"}</Text>
              {config?.praticienNom && <Text>{config.praticienNom}</Text>}
              {config?.adresse && <Text>{config.adresse}</Text>}
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.title}>DOSSIER PATIENT</Text>
            <Text>Édité le {fmtDate(new Date())}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identité</Text>
          <View style={styles.grid}>
            <Field label="Nom" value={patient.nom} />
            <Field label="Prénom" value={patient.prenom} />
            <Field label="Date de naissance" value={fmtDate(patient.dateNaissance)} />
            <Field label="Statut" value={patient.actif ? "Actif" : "Inactif"} />
            <Field label="Email" value={patient.email} />
            <Field label="Téléphone" value={patient.telephone} />
            <Field label="Adresse" value={patient.adresse} />
            <Field label="N° Sécu" value={patient.numeroSecu} />
          </View>
        </View>

        {patient.motifConsult ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motif de consultation</Text>
            <Text style={styles.notes}>{patient.motifConsult}</Text>
          </View>
        ) : null}

        {patient.notesCliniques ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes cliniques</Text>
            <Text style={styles.notes}>{patient.notesCliniques}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.grid}>
            <Field label="Séances totales" value={String(totalSeances)} />
            <Field label="Séances honorées" value={String(honorees)} />
            <Field label="Annulations / absences" value={String(annulees)} />
            <Field label="CA cumulé" value={fmtEuros(caTotal)} />
          </View>
        </View>

        {seances.length > 0 ? (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Historique des séances</Text>
            <View style={styles.table}>
              <View style={styles.th}>
                <Text style={styles.colDate}>Date</Text>
                <Text style={styles.colMid}>Durée</Text>
                <Text style={styles.colStatut}>Statut</Text>
                <Text style={styles.colMidR}>Tarif</Text>
              </View>
              {seances.map((s) => (
                <View key={s.id} style={styles.tr}>
                  <Text style={styles.colDate}>{fmtDateTime(s.date)}</Text>
                  <Text style={styles.colMid}>{s.dureeMinutes} min</Text>
                  <Text style={styles.colStatut}>{seanceStatutLabel(s.statut)}</Text>
                  <Text style={styles.colMidR}>{fmtEuros(s.tarif)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {factures.length > 0 ? (
          <View style={styles.section} wrap>
            <Text style={styles.sectionTitle}>Factures</Text>
            <View style={styles.table}>
              <View style={styles.th}>
                <Text style={styles.colDate}>Numéro</Text>
                <Text style={styles.colMid}>Émise le</Text>
                <Text style={styles.colStatut}>Statut</Text>
                <Text style={styles.colMidR}>TTC</Text>
              </View>
              {factures.map((f) => (
                <View key={f.id} style={styles.tr}>
                  <Text style={styles.colDate}>{f.numero}</Text>
                  <Text style={styles.colMid}>{fmtDate(f.dateEmission)}</Text>
                  <Text style={styles.colStatut}>{factureStatutLabel(f.statut)}</Text>
                  <Text style={styles.colMidR}>{fmtEuros(f.montantTTC)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.confidential}>
          <Text>
            Document confidentiel — Usage interne réservé. Toute diffusion non autorisée est
            strictement interdite (article L. 1110-4 du Code de la santé publique).
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            {config?.cabinetNom ?? ""}
            {config?.siret ? ` · SIRET ${config.siret}` : ""}
            {config?.adeli ? ` · ADELI ${config.adeli}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
