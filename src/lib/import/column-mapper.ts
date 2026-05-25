/**
 * Mapping de colonnes : suggère un champ cible pour chaque en-tête source.
 * Bilingue FR / EN, insensible aux accents et à la casse.
 */

export type TargetEntity = "patients" | "seances" | "factures";

export const TARGET_FIELDS: Record<TargetEntity, string[]> = {
  patients: [
    "id",
    "nom",
    "prenom",
    "dateNaissance",
    "email",
    "telephone",
    "adresse",
    "numeroSecu",
    "motifConsult",
    "notesCliniques",
    "actif"
  ],
  seances: [
    "id",
    "patientId",
    "patientNom",
    "patientPrenom",
    "patientEmail",
    "date",
    "dureeMinutes",
    "tarif",
    "statut",
    "doctolibRef",
    "sourceImport",
    "notesSeance",
    "factureId"
  ],
  factures: [
    "id",
    "numero",
    "patientId",
    "patientNom",
    "patientPrenom",
    "dateEmission",
    "dateEcheance",
    "montantHT",
    "montantTTC",
    "tva",
    "statut",
    "datePaiement",
    "modePaiement",
    "notes"
  ]
};

/** Dictionnaire de synonymes : alias normalisé → champ cible canonique. */
const DICTIONARY: Record<TargetEntity, Record<string, string>> = {
  patients: {
    id: "id",
    identifiant: "id",
    nom: "nom",
    "nom de famille": "nom",
    lastname: "nom",
    "last name": "nom",
    prenom: "prenom",
    firstname: "prenom",
    "first name": "prenom",
    "date de naissance": "dateNaissance",
    naissance: "dateNaissance",
    birthdate: "dateNaissance",
    "date naissance": "dateNaissance",
    email: "email",
    mail: "email",
    courriel: "email",
    telephone: "telephone",
    "tel": "telephone",
    "tel portable": "telephone",
    "telephone portable": "telephone",
    portable: "telephone",
    mobile: "telephone",
    phone: "telephone",
    adresse: "adresse",
    address: "adresse",
    rue: "adresse",
    "n secu": "numeroSecu",
    "numero securite sociale": "numeroSecu",
    "securite sociale": "numeroSecu",
    "ss": "numeroSecu",
    nir: "numeroSecu",
    "motif": "motifConsult",
    "motif consultation": "motifConsult",
    "motif de consultation": "motifConsult",
    "notes": "notesCliniques",
    "notes cliniques": "notesCliniques",
    commentaire: "notesCliniques",
    actif: "actif",
    active: "actif"
  },
  seances: {
    id: "id",
    "id patient": "patientId",
    "id du patient": "patientId",
    patientid: "patientId",
    "ref patient": "patientId",
    "nom patient": "patientNom",
    "prenom patient": "patientPrenom",
    "email patient": "patientEmail",
    "mail patient": "patientEmail",
    date: "date",
    "date seance": "date",
    "date rdv": "date",
    "rendez vous": "date",
    rdv: "date",
    appointment: "date",
    duree: "dureeMinutes",
    "duree min": "dureeMinutes",
    "duree minutes": "dureeMinutes",
    duration: "dureeMinutes",
    tarif: "tarif",
    prix: "tarif",
    montant: "tarif",
    price: "tarif",
    statut: "statut",
    status: "statut",
    etat: "statut",
    "ref doctolib": "doctolibRef",
    doctolibref: "doctolibRef",
    "reference doctolib": "doctolibRef",
    "id doctolib": "doctolibRef",
    source: "sourceImport",
    "source import": "sourceImport",
    "notes": "notesSeance",
    "notes seance": "notesSeance",
    "commentaire": "notesSeance",
    "id facture": "factureId",
    factureid: "factureId"
  },
  factures: {
    id: "id",
    numero: "numero",
    "n facture": "numero",
    "n": "numero",
    invoice: "numero",
    "id patient": "patientId",
    patientid: "patientId",
    "nom patient": "patientNom",
    "prenom patient": "patientPrenom",
    "date emission": "dateEmission",
    "emise le": "dateEmission",
    date: "dateEmission",
    "date echeance": "dateEcheance",
    echeance: "dateEcheance",
    "due date": "dateEcheance",
    "montant ht": "montantHT",
    ht: "montantHT",
    "montant ttc": "montantTTC",
    ttc: "montantTTC",
    montant: "montantTTC",
    total: "montantTTC",
    tva: "tva",
    vat: "tva",
    statut: "statut",
    status: "statut",
    "date paiement": "datePaiement",
    "paye le": "datePaiement",
    "mode paiement": "modePaiement",
    "mode de paiement": "modePaiement",
    paiement: "modePaiement",
    notes: "notes",
    commentaire: "notes"
  }
};

function normalize(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[€()%]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Suggère un mapping `{ en-tête source → champ cible }` pour l'entité.
 * Retourne uniquement les en-têtes pour lesquels un champ cible a été identifié.
 */
export function suggestMapping(headers: string[], target: TargetEntity): Record<string, string> {
  const dict = DICTIONARY[target];
  const result: Record<string, string> = {};
  for (const h of headers) {
    if (!h) continue;
    const n = normalize(h);
    // Match exact prioritaire
    if (dict[n]) {
      result[h] = dict[n];
      continue;
    }
    // Match par "contains" sur les clefs de dictionnaire les plus longues d'abord
    const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (k.length < 3) continue;
      if (n.includes(k) || k.includes(n)) {
        result[h] = dict[k];
        break;
      }
    }
  }
  return result;
}

export function applyMapping<T extends Record<string, unknown>>(
  rows: T[],
  mapping: Record<string, string>
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [src, dst] of Object.entries(mapping)) {
      if (src in row && row[src] !== undefined && row[src] !== "") {
        out[dst] = row[src];
      }
    }
    return out;
  });
}
