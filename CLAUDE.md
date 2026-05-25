# PsychHub — Mémoire projet

Application **locale & sécurisée** de gestion d'un cabinet de psychologie solo (patients, séances, factures, KPI). Local-first, données sensibles, RGPD.

## Stack

- **Framework** : Next.js 14 (App Router) + TypeScript 5.6 strict
- **UI** : React 18 + Tailwind 3.4 + Shadcn/ui (Radix)
- **State** : Zustand 5 + Zundo (undo/redo) + TanStack Query 5
- **BD** : Prisma 5.20 + SQLite (fichier local `data/psychhub.db`, chiffré BitLocker)
- **Forms** : React Hook Form + Zod
- **Graphiques** : Recharts (lazy-loaded)
- **Éditeur WYSIWYG** : react-grid-layout (lazy en mode édition)
- **Tests** : Vitest + Testing Library + jsdom
- **Intégrations** : Google Sheets (tree-shaken via `@googleapis/sheets`), Doctolib XLSX, PDF (`@react-pdf/renderer`)

## Commandes

| But | Commande |
|---|---|
| Dev | `npm run dev` (http://localhost:3000) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) |
| Tests | `npm run test` (single run) / `npm run test:watch` |
| Couverture | `npm run test:cov` |
| Prisma generate | `npm run db:generate` |
| Migrations | `npm run db:migrate` |
| Seed | `npm run db:seed` |
| Studio | `npm run db:studio` |

## Hooks pre-commit

- **Husky 9 + lint-staged 15** configurés. Pre-commit lance `eslint --fix` sur les fichiers TS/JS stagés puis `tsc --noEmit` sur tout le projet.
- S'active automatiquement via le script `prepare` du `package.json` dès que `.git/` existe.
- Bypass exceptionnel : `git commit --no-verify` (à éviter — diagnostiquer plutôt l'échec).
- Hook source : `.husky/pre-commit`.

## Couverture de tests existante

15 fichiers de tests, **177 tests** au total. Ne pas casser sans remplacer :

| Domaine | Fichier |
|---|---|
| Validators | `src/lib/validators/__tests__/{patient,seance,facture}.test.ts` |
| Utils | `src/lib/__tests__/{date-range,markdown}.test.ts` |
| Import | `src/lib/import/__tests__/transformers.test.ts` |
| Excel | `src/lib/excel/__tests__/doctolib-parser.test.ts` |
| Séances logique | `src/lib/seances/__tests__/conflict.test.ts` |
| Backup | `src/lib/backup/__tests__/{rotation,db-integrity}.test.ts` |
| Relances/rappels | `src/server/__tests__/{relances,rappels}.test.ts` |
| Cache tags | `src/server/__tests__/cache-tags.test.ts` |
| Calendar | `src/lib/calendar/__tests__/ics-builder.test.ts` |
| UI | `src/components/shared/__tests__/responsive-table.test.tsx` |

`npm run test` doit toujours retourner **15 fichiers / 177 tests OK**. Au moindre changement de logique métier (validators, facturation, conflits, rappels…) → écrire le test avant.

Pattern pour tester une server action : mocker `@/lib/db`, `next/cache` et `@/server/with-audit` (qui importe `server-only`). Exemple dans `src/server/__tests__/rappels.test.ts`.

## Conventions de code

- **TypeScript strict** : pas de `any` implicite, préférer `unknown` + narrowing.
- **Server Actions** dans `src/server/*.actions.ts` — toujours valider l'entrée avec un schéma Zod (`src/lib/validators/`).
- **Validations métier** : utiliser les helpers de `src/lib/validators/common.ts` (IBAN mod-97, téléphone via `libphonenumber-js`, SIRET Luhn, N° SS clé INSEE).
- **Audit log** : toute mutation sur Patient / Séance / Facture / Config / Layout doit passer par `src/lib/audit.ts`.
- **i18n** : textes UI via `src/lib/i18n.ts` + fichiers `src/messages/{fr,en}.json`. Pas de chaînes en dur dans le JSX.
- **Imports Google** : utiliser uniquement `@googleapis/sheets` et `google-auth-library` — **jamais** le paquet `googleapis` complet (gain ~800 KB).
- **Recharts** : importer dynamiquement (`next/dynamic` avec `ssr: false`) dans les modules de graphique.
- **Composants UI** : primitives Shadcn dans `src/components/ui/`, ne pas les modifier sans raison forte.
- **JSX texte** : toujours échapper les apostrophes/guillemets (`&apos;`, `&quot;`) — ESLint `react/no-unescaped-entities` bloque en build.

## Conventions UX (cabinet solo, français accessible)

Toute interface visible par l'utilisateur final suit ces règles. Respecter pour cohérence visuelle.

- **Vocabulaire français complet** : pas de "BROUILLON" / "EMISE" en MAJ brutes côté UI. Utiliser systématiquement les helpers :
  - **Factures** : `src/lib/factures/statut-labels.ts` (`factureStatutLabel`, `factureStatutVariant`, `factureStatutHelp`, `modePaiementLabel`, `MODE_LABEL`)
  - **Séances** : `src/lib/seance-colors.ts` (`SEANCE_STATUT_VISUALS`, `getStatutVisual`) — fournit label + classe Tailwind + couleur HEX
- **Boutons d'action** : phrases verbales complètes ("Ajouter au planning", "Créer la fiche patient", "Enregistrer les modifications"). Pas de "Créer" / "OK" / "Enregistrer" tout courts.
- **Toasts métiers** : "Marie Dupont ajoutée à vos patients" plutôt que "Patient créé". Personnaliser avec les vraies valeurs.
- **Placeholders réalistes** : `06 12 34 56 78`, `marie.dupont@email.fr`, `12 rue de la Paix, 75002 Paris`. Pas de "ex: phone".
- **Helpers de champ** (`<p className="text-xs text-muted-foreground">`) sous chaque input pour expliquer pourquoi et avec quoi remplir.
- **Bandeaux d'aide contextuels** en tête de chaque page complexe (icône + titre + 1 paragraphe). Indiquer durée typique si pertinent.
- **Stats numériques** en haut des pages liste (Patients, Séances, Factures) — 4 cartes : situation actuelle, alerte si critique.
- **Bandeaux RGPD/confidentialité** sur les zones sensibles (notes cliniques, formulaire patient) : `🔒 Ces données restent sur votre ordinateur`.
- **Empty states pédagogiques** : pas "Aucun X". Expliquer pourquoi c'est vide + comment ajouter le premier.
- **Sections dépliantes** (Paramètres) via le composant `src/components/parametres/settings-section.tsx` — `<details>` natif accessible.
- **Confirmations destructives** : `ConfirmDialog` avec description détaillée du **pourquoi c'est irréversible** et **quelles données sont touchées**.

## Helpers centralisés à connaître

| Helper | Rôle |
|---|---|
| `src/lib/factures/statut-labels.ts` | Libellés humains + variantes Badge + aide contextuelle pour statuts facture et modes de paiement |
| `src/lib/seance-colors.ts` | Visuels (label, classe Badge, couleur HEX) pour les statuts séance |
| `src/lib/validators/common.ts` | Schémas Zod IBAN/SIRET/NSS/téléphone — réutiliser systématiquement |
| `src/lib/audit.ts` | Wrapper `withAudit()` pour Server Actions mutantes |
| `src/components/parametres/settings-section.tsx` | Section dépliante (Paramètres) — `<details>` Tailwind-stylé |

## Système de backup

Cœur dans `src/lib/backup/` :

- `service.ts` : `runBackup({ destinations: ["local"|"drive"|"external"] })` + `getBackupHealth()` + `getTimeline()`.
- `local-backup.ts` : génère XLSX humain (`writeHumanReadableSnapshot`) + JSON fidèle dans `Sauvegarde/`.
- `scheduler.ts` : tick horaire (idempotent, mono-process Next.js), boot via `src/lib/db.ts`.
- `rotation.ts` : `pruneLocalBackups({ retentionDays, minKeep })` — appelé automatiquement après chaque backup local/external OK.
- `integrity.ts` : SHA-256 des fichiers de backup (`verifyBackupIntegrity`).
- `db-integrity.ts` : `PRAGMA integrity_check` SQLite. **Lancé au boot du serveur** (idempotent) via `src/lib/db.ts`. Server actions `runDatabaseIntegrityCheck()` + `readLastDatabaseIntegrity()` dans `src/server/backup-integrity.actions.ts`. Exposé dans **Paramètres → Sauvegardes automatiques** via `src/components/parametres/database-health-card.tsx` (badge statut + bouton « Vérifier maintenant » + détails techniques dépliants).

**Réglages dans `Config`** : `backupAutoEnabled` (bool), `backupIntervalHours` (Int 24), `backupWarningThresholdDays` (Int 3), `externalBackupFolder` (path), `backupRetentionDays` (Int 30), `backupMinKeep` (Int 7), `backupDestinationsJson` (JSON).

## Rappels & relances (flows mail manuels)

PsychHub ne fait **aucun envoi mail automatique** (cohérence local-first, pas de SMTP). Le pattern : générer un brouillon `.eml` que l'utilisateur ouvre dans Outlook/Mail, puis confirmer l'envoi pour marquer l'historique.

### Rappels de séance

- **Activation** : `Config.rappelsActifs` (bool, défaut `false`) + `rappelsHeuresAvant` (Int, 1-168, défaut 24) + `templateMailRappelSeance`. Configurables dans **Paramètres → Emails automatiques (modèles) → Rappels avant séance**.
- **Page** `/rappels` (`src/app/(app)/rappels/page.tsx`) : 2 sections (« À envoyer maintenant » + « À rattraper », 24 h glissantes). Liste les séances `PLANIFIEE` avec patient actif + email, sans rappel déjà envoyé.
- **Badge sidebar** : compteur numéroté ambre alimenté par `compterRappelsEnAttente()`. Affiche `0` (donc caché) si feature désactivée. Voir `src/app/(app)/layout.tsx` + `src/components/layout/sidebar.tsx`.
- **Server actions** : `src/server/rappels.actions.ts` (`listerRappelsEnAttente`, `compterRappelsEnAttente`, `marquerRappelEnvoye`, `marquerRappelsEnvoyesBatch`).
- **Marquage idempotent** via `Seance.rappelEnvoyeAt: DateTime?` (migration `20260517120000_add_rappel_envoye_at`). Reset à `null` automatique dans `updateSeance` + `rescheduleSeance` si la date change.
- **Route API** `/api/mail/rappel-seance/[id]` : 403 si `rappelsActifs=false`, audit `READ_SENSITIVE` à chaque génération `.eml`.

### Relances facture impayée

- **Détection** : `genererBrouillonsRelance()` (`src/server/relances.actions.ts`) — filtre les factures `EMISE`/`EN_RETARD` dont l'échéance est dépassée selon les paliers `Config.delaisRelancesJson` (défaut `[15, 30, 45]`).
- **Marquage UI** : bouton « J'ai envoyé cette relance » dans `EmailPreviewDialog` après téléchargement du `.eml` → appelle `marquerRelanceEnvoyeeUI(factureId)` (idempotent, audit `UPDATE`, écrit dans `Facture.relancesEnvoyeesJson`).
- **Historique** affiché sur la fiche facture détaillée (`src/app/(app)/factures/[id]/page.tsx`) via `getRelancesHistory(factureId)`.

## Architecture import/export (refonte UX)

L'écran `/import-export` est structuré en **3 onglets uniquement** :

1. **Importer** : wizard unique qui détecte fichier local OU URL Google Sheets ; replie Doctolib + Excel simple dans `<details>` "Autres méthodes (avancé)".
2. **Exporter** : exports rapides en haut (Tout en Excel, Sauvegarder, Excel détaillé) + carte Word + `ExportComposer` replié dans `<details>` "Export personnalisé".
3. **Google** : connexion + statut (les actions ponctuelles Sheets/Drive sont dans Importer/Exporter).

**Bandeau statut Google permanent** en haut de la page (vert "Connecté" / ambre "Non connecté + Connecter").

Ne pas réintroduire d'onglets séparés Excel/Word/Doctolib — ils sont consolidés.

## Architecture (raccourci)

```
src/
├── app/(app)/        # Pages : dashboard, patients, seances, rappels, factures, kpi, parametres, sauvegardes, import-export
├── app/api/          # Routes API (OAuth Google, import XLSX, mail, pdf)
├── components/       # editor/, layout/, shared/, theme/, ui/ + un dossier par domaine
├── editor/           # ⭐ Cœur du mode éditeur WYSIWYG (store, registry, 20+ modules)
├── server/           # Server Actions (un fichier par domaine)
├── lib/              # db.ts, audit.ts, i18n.ts, validators/, google/, excel/
├── messages/         # fr.json, en.json
└── stores/           # Stores Zustand globaux UI
```

Détails : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/EDITOR_GUIDE.md](docs/EDITOR_GUIDE.md).

## Mode éditeur — règles

- Activable sur les 6 onglets (toggle Topbar ou touche `E`).
- Catalogue de modules dans `src/editor/modules/{kpi,charts,listes,utils}`.
- Tout nouveau module **doit** être enregistré dans le registry (`src/editor/registry/`) avec un id stable, un titre i18n, et un layout par défaut.
- Autosave debounced 2s + `Cmd+S` explicite. Undo/redo via Zundo (50 étapes).
- Sérialisation des layouts : `src/editor/utils/layout-serialization.ts` — ne pas casser la rétro-compatibilité (versionner si besoin).

## Sécurité / RGPD

- **Aucune donnée patient** ne doit sortir vers un service externe par défaut. Le backup Google Sheets est **opt-in** par utilisateur.
- Le refresh token Google n'est **jamais** exporté ni loggué.
- Les server actions doivent rejeter toute entrée non validée par Zod.
- Pas d'`console.log` de données patient en production — passer par l'audit log.

## Performance — à respecter

- Lazy-load systématique de `recharts` et `react-grid-layout`.
- Indexes Prisma existants : `[statut, date]`, `[email]`, `[patientId]`, `[actif]` — vérifier avant d'ajouter une requête lourde.
- Recherche globale < 200 ms cible (cross-table patients/séances/factures).

## Variables d'environnement

`.env.local` à la racine (cf. `.env.example`) :

```ini
DATABASE_URL="file:./data/psychhub.db"
GOOGLE_CLIENT_ID=                                       # optionnel (backup Sheets)
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/auth"
```

Note : la BD réelle est dans `data/` (gitignored), **pas** dans `prisma/`. Le dossier `prisma/` ne contient que le schéma et les migrations.

## Pièges connus

- **Windows** : chemin SQLite avec `file:./data/psychhub.db` — toujours en relatif, sinon Prisma casse.
- **PWA** : le `manifest.webmanifest` et les icônes SVG doivent rester servis statiquement depuis `public/`.
- **Tests** : `vitest.config.ts` utilise jsdom — éviter les imports Node-only dans les composants testés.
- **next-themes** : hydration mismatch si `suppressHydrationWarning` retiré du `<html>` dans `app/layout.tsx`.
- **Drift Prisma** : résolu au 2026-05-17 par `20260517100000_resolve_schema_drift` (migration additive ALTER ADD COLUMN + CREATE TABLE). Si tu modifies `schema.prisma`, génère immédiatement une migration — ne pas accumuler de drift à nouveau.
- **`Image` de `@react-pdf/renderer`** : faux positif `jsx-a11y/alt-text`. Préfixer la ligne d'`// eslint-disable-next-line jsx-a11y/alt-text` (déjà fait pour `facture-template.tsx` et `patient-dossier-template.tsx`).

## Ce qu'il ne faut PAS faire

- Ne pas réintroduire le paquet `googleapis` complet.
- Ne pas ajouter de dépendance pour un besoin déjà couvert (date-fns, zod, lucide-react…).
- Ne pas créer de fichiers `.md` de documentation sans demande explicite.
- Ne pas committer `data/psychhub.db`, `.env*`, `node_modules`, `.next`, `tsconfig.tsbuildinfo`, ni le dossier `Sauvegarde/` (tous déjà gitignored).
- Ne pas afficher de statuts bruts en MAJUSCULES côté UI ("BROUILLON", "PLANIFIEE") — passer par les helpers `factureStatutLabel` / `SEANCE_STATUT_VISUALS`.
- Ne pas réintroduire d'onglets séparés Excel/Word/Doctolib dans `/import-export` — la structure à 3 onglets (Importer/Exporter/Google) est délibérée.
- Ne pas remettre des libellés techniques ("Composer", "Scope", "Mapping", "Dédoublonnage") dans l'UI — utiliser le vocabulaire métier des conventions UX ci-dessus.
- Ne pas lancer `npx prisma migrate reset` sur la BD locale — elle peut contenir des données patient réelles.

## Configuration Claude Code (`.claude/`)

- **`.claude/settings.json`** : permissions pré-autorisées (`npm run *`, `npx prisma generate/migrate dev/deploy/push/format/studio`, git read-only) et denies pour les commandes destructives (`prisma migrate reset`, `rm -rf data/psychhub.db`, `rm -rf prisma/migrations`, `rm -rf Sauvegarde`, force push, lecture `.env*`).
- **`.claude/commands/`** : 4 slash-commands projet
  - `/add-module` — scaffold module éditeur WYSIWYG (composant + registry + i18n + test)
  - `/add-action` — server action avec Zod + audit + test
  - `/migrate-safe` — migration Prisma en 2 temps (ajout → backfill → suppression)
  - `/check-health` — lint + typecheck + tests + intégrité BD + santé backup
