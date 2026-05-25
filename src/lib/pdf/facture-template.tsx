import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Patient, Facture, Seance, Config } from "@prisma/client";
import { ligneLibreSchema, type LigneLibre } from "@/lib/validators/facture";

const DEFAULT_PRIMARY = "#1f2933";
const DEFAULT_MENTIONS =
  "TVA non applicable, article 293 B du CGI (sauf mention contraire). Document généré par PsychHub.";

function parseLignes(raw: string | null | undefined): LigneLibre[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ligneLibreSchema.safeParse(x))
      .filter((r) => r.success)
      .map((r) => (r as { data: LigneLibre }).data);
  } catch {
    return [];
  }
}

function makeStyles(primary: string) {
  return StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2933" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
    headerLeft: { flexDirection: "row", gap: 12 },
    logo: { width: 56, height: 56, objectFit: "contain", marginRight: 8 },
    cabinet: { fontSize: 13, fontWeight: 700, color: primary },
    meta: { textAlign: "right", fontSize: 9, color: "#52606d" },
    title: { fontSize: 22, fontWeight: 700, marginBottom: 4, color: primary },
    block: { marginBottom: 16 },
    sectionLabel: {
      fontSize: 9,
      color: "#9aa5b1",
      textTransform: "uppercase",
      marginBottom: 4
    },
    patient: { fontSize: 11, fontWeight: 700 },
    table: { borderTopWidth: 1, borderTopColor: "#cbd2d9", marginTop: 20 },
    tr: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e4e7eb",
      paddingVertical: 6
    },
    th: { flexDirection: "row", paddingVertical: 8, backgroundColor: "#f5f7fa" },
    colDate: { width: "25%", paddingHorizontal: 6 },
    colDesc: { width: "50%", paddingHorizontal: 6 },
    colQte: { width: "10%", paddingHorizontal: 6, textAlign: "right" },
    colMontant: { width: "15%", paddingHorizontal: 6, textAlign: "right" },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingVertical: 4,
      paddingHorizontal: 6
    },
    totalsLabel: { width: 100, textAlign: "right", color: "#52606d" },
    totalsValue: { width: 80, textAlign: "right" },
    totalsValueBold: { width: 80, textAlign: "right", fontWeight: 700, fontSize: 12, color: primary },
    footer: {
      position: "absolute",
      bottom: 32,
      left: 40,
      right: 40,
      fontSize: 8,
      color: "#9aa5b1"
    }
  });
}

function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR");
}

function fmtEuros(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export function FactureDocument({
  facture,
  patient,
  seances,
  config
}: {
  facture: Facture;
  patient: Patient;
  seances: Seance[];
  config: Config | null;
}) {
  // Type guard pour les nouvelles colonnes (en attendant la régénération du client Prisma).
  const cfg = config as (Config & { logoBase64?: string | null; couleurPrimaire?: string | null; mentionsLegales?: string | null }) | null;
  const primary = cfg?.couleurPrimaire?.trim() || DEFAULT_PRIMARY;
  const mentions = cfg?.mentionsLegales?.trim() || DEFAULT_MENTIONS;
  const styles = makeStyles(primary);

  const lignesLibres = parseLignes(
    (facture as Facture & { lignesLibres?: string | null }).lignesLibres
  );
  const acompte = (facture as Facture & { acompte?: number }).acompte ?? 0;
  const soldeDu = Math.max(0, facture.montantTTC - acompte);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
              {config?.telephone && <Text>Tél : {config.telephone}</Text>}
              {config?.email && <Text>{config.email}</Text>}
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.title}>FACTURE</Text>
            <Text>N° {facture.numero}</Text>
            <Text>Émise le {fmtDate(facture.dateEmission)}</Text>
            {facture.dateEcheance && <Text>Échéance : {fmtDate(facture.dateEcheance)}</Text>}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionLabel}>Facturé à</Text>
          <Text style={styles.patient}>
            {patient.prenom} {patient.nom}
          </Text>
          {patient.adresse && <Text>{patient.adresse}</Text>}
          {patient.email && <Text>{patient.email}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.colDate}>Date</Text>
            <Text style={styles.colDesc}>Prestation</Text>
            <Text style={styles.colQte}>Qté</Text>
            <Text style={styles.colMontant}>Montant</Text>
          </View>
          {seances.map((s) => (
            <View key={s.id} style={styles.tr}>
              <Text style={styles.colDate}>{fmtDate(s.date)}</Text>
              <Text style={styles.colDesc}>Consultation ({s.dureeMinutes} min)</Text>
              <Text style={styles.colQte}>1</Text>
              <Text style={styles.colMontant}>{fmtEuros(s.tarif)}</Text>
            </View>
          ))}
          {lignesLibres.map((l, i) => (
            <View key={`l-${i}`} style={styles.tr}>
              <Text style={styles.colDate}>—</Text>
              <Text style={styles.colDesc}>{l.description}</Text>
              <Text style={styles.colQte}>{l.quantite ?? 1}</Text>
              <Text style={styles.colMontant}>
                {fmtEuros(l.montant * (l.quantite ?? 1))}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total HT</Text>
            <Text style={styles.totalsValue}>{fmtEuros(facture.montantHT)}</Text>
          </View>
          {facture.tva > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>TVA ({facture.tva}%)</Text>
              <Text style={styles.totalsValue}>
                {fmtEuros(facture.montantTTC - facture.montantHT)}
              </Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Total TTC</Text>
            <Text style={styles.totalsValueBold}>{fmtEuros(facture.montantTTC)}</Text>
          </View>
          {acompte > 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Acompte versé</Text>
                <Text style={styles.totalsValue}>− {fmtEuros(acompte)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Solde dû</Text>
                <Text style={styles.totalsValueBold}>{fmtEuros(soldeDu)}</Text>
              </View>
            </>
          )}
        </View>

        {facture.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text>{facture.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>
            {config?.cabinetNom ?? ""}
            {config?.siret ? ` · SIRET ${config.siret}` : ""}
            {config?.adeli ? ` · ADELI ${config.adeli}` : ""}
            {config?.iban ? ` · IBAN ${config.iban}` : ""}
          </Text>
          <Text>{mentions}</Text>
        </View>
      </Page>
    </Document>
  );
}
