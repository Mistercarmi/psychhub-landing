# Mode éditeur — règles locales

Cœur du WYSIWYG drag/drop/resize. Tout passe par ce dossier.

## Sous-dossiers

- `store/` — Zustand + middleware Zundo (undo/redo, 50 étapes). **Ne pas** muter le state hors actions.
- `registry/` — enregistrement des modules. Tout nouveau module **doit** y être déclaré (id stable, titre i18n, layout par défaut, catégorie).
- `modules/{kpi,charts,listes,utils}/` — implémentations. Un module = un composant + sa config (paramètres exposés à l'utilisateur).
- `components/` — `EditorCanvas`, `ModulePalette`, `ModuleWrapper`, etc. UI de l'éditeur.
- `hooks/` — `useAutosaveLayout`, `useKeyboardShortcuts`, …
- `context/ModulesDataProvider` — alimente les modules depuis le SSR. Pas d'appels réseau côté module.
- `utils/` — `layout-defaults`, `layout-serialization`, `grid-math`.

## Règles

- **Lazy-load** : `react-grid-layout` ne doit être importé que quand le mode édition est actif.
- **Recharts** : `next/dynamic({ ssr: false })` dans les modules `charts/`.
- **Sérialisation** : si tu modifies le format du layout, incrémente la version dans `layout-serialization.ts` et écris un migrateur. Pas de cassure silencieuse — un layout utilisateur existant doit toujours charger.
- **Id de module** : stable, kebab-case, jamais renommé après publication (sinon les layouts existants pointent dans le vide).
- **Données** : un module ne fait pas d'I/O directement. Il consomme `ModulesDataProvider` (alimenté côté serveur).
- **i18n** : titres et libellés via clés `src/messages/{fr,en}.json`, pas de chaînes en dur.
- **Statuts métier** : un module qui affiche un statut de facture ou séance **doit** passer par les helpers centralisés :
  - Factures → `factureStatutLabel/Variant` de `src/lib/factures/statut-labels.ts`
  - Séances → `getStatutVisual` / `SEANCE_STATUT_VISUALS` de `src/lib/seance-colors.ts`
  Jamais de "BROUILLON" / "PLANIFIEE" en MAJ brutes dans le rendu.

## Modules connus en dette technique

✅ **Dette statuts métier résolue au 2026-05-17.** Tous les modules WYSIWYG, le PDF dossier patient, l'export DOCX et la preview Doctolib passent désormais par `factureStatutLabel/Variant` et `getStatutVisual` / `SEANCE_STATUT_VISUALS`.

Si tu réintroduis un affichage de statut brut, garde en tête la règle : utiliser systématiquement les helpers centralisés. Un nouveau module qui affiche `s.statut` ou `f.statut` sans passer par un helper est un bug à corriger avant merge.

## Ajouter un module — checklist

1. Créer le composant dans `modules/<catégorie>/`.
2. Déclarer un id, un titre i18n, un layout par défaut (`w`, `h`, `minW`, `minH`).
3. Enregistrer dans `registry/`.
4. Ajouter les clés i18n FR + EN.
5. Si données serveur nécessaires : étendre `src/server/modules-data.actions.ts` et `ModulesDataProvider`.
6. Test minimal (rendu + interaction clé) dans `src/test/`.
