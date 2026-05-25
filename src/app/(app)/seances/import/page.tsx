import { redirect } from "next/navigation";

/**
 * L'import Doctolib est désormais accessible depuis la page Importer & Exporter,
 * onglet "Importer" (l'assistant détecte automatiquement les exports Doctolib,
 * ou bouton dédié dans "Autres méthodes d'import").
 */
export default function ImportDoctolibRedirect() {
  redirect("/import-export?tab=importer");
}
