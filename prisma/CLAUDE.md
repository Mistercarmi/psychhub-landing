# Prisma — règles locales

Schéma SQLite local. **BD réelle** dans `data/psychhub.db` (configurée via `DATABASE_URL=file:./data/psychhub.db`, dossier `data/` gitignored). Le dossier `prisma/` ne contient que le schéma et les migrations. Données sensibles patient — chiffrement au repos via BitLocker.

## Chronologie des migrations

| Date | Migration | Contenu |
|---|---|---|
| 2026-05-14 | `20260514092045_init` | Tables `Patient`, `Seance`, `Facture`, `Config` initiales |
| 2026-05-15 | `20260515120000_full_p1_to_p4` | Ajout `Tag`, `Layout`, et liens N-N tags |
| 2026-05-15 | `20260515212502_import_export_google_access` | Champs Google OAuth + import/export logs |
| 2026-05-16 | `20260516083302_hub_logs_and_config` | `ImportLog`, `ExportLog`, `BackupLog`, champs Config sauvegarde |
| 2026-05-17 | `20260517063301_add_backup_retention` | `Config.backupRetentionDays` + `backupMinKeep` (rotation locale) |
| 2026-05-17 | `20260517100000_resolve_schema_drift` | Rattrape le drift : `Paiement`, `FactureVersion`, `ImportMappingPreset` + champs `Facture.lignesLibres`/`acompte`/`relancesEnvoyeesJson`, `Patient.photoUrl`, `BackupLog.hash`/`signatureValid`/`logs`, `Config.templateMailRappelSeance`/`rappels*`/`logoBase64`/`couleurPrimaire`/`mentionsLegales`/`delaisRelancesJson` |
| 2026-05-17 | `20260517110000_remove_unused_fields` | Nettoyage : suppression de `FactureVersion` (modèle complet, jamais utilisé) et `BackupLog.logs` (jamais écrit). `Config.logoBase64`/`couleurPrimaire`/`mentionsLegales` **conservés** car consommés par les templates PDF, en attente d'UI de saisie. |

✅ **Drift résolu au 2026-05-17.** Schema et migrations sont alignés. Si tu ajoutes un champ à `schema.prisma`, génère immédiatement la migration correspondante.

## Workflow migrations

1. Modifier `schema.prisma`.
2. `npm run db:migrate` — crée un dossier daté dans `migrations/` + applique.
3. **Toujours** committer le dossier de migration généré.
4. `npm run db:generate` si le client n'est pas régénéré automatiquement.
5. `npm run db:seed` pour réinjecter les données de seed (`seed.ts`).

## Règles

- **Pas de `prisma migrate reset`** sans confirmation — la BD locale peut contenir des données réelles.
- **Indexes obligatoires** sur les champs filtrés à fort volume. Existants : `[statut, date]`, `[email]`, `[patientId]`, `[actif]`. Ajouter si nouvelle requête fréquente.
- **SQLite limits** : pas de type `Json` natif performant — sérialiser en `String` si besoin. Pas d'`@db.*` spécifiques Postgres.
- **Soft delete** : préférer un champ `actif: Boolean` ou `deletedAt: DateTime?` plutôt qu'un `DELETE` dur (audit log + récupération).
- **Renommage de champ** : faire une migration en 2 temps (ajout + backfill + suppression) si la table contient des données. Slash-command `/migrate-safe` disponible pour guider.
- **Migrations auto-générées suspectes** : `prisma migrate dev --create-only` peut embarquer des changements de schéma non liés à votre intention (drift). **Toujours relire la SQL** et retirer ce qui n'est pas demandé avant d'appliquer.

## Seed

`seed.ts` doit rester **idempotent** : `upsert` plutôt que `create`. Pas de données réelles dedans.

## Fichiers à ne jamais committer

- `data/psychhub.db`, `data/*.db-journal`, `data/*.db-wal` (déjà gitignored via `data/` et `*.db`)
- Tout dump SQL contenant des données patient
- Le dossier `Sauvegarde/` (déjà gitignored)

## Drift — historique

Le drift précédent (modèles `Paiement`/`FactureVersion`/`ImportMappingPreset` + champs `Facture.lignesLibres`/`acompte`/`relancesEnvoyeesJson`, `Patient.photoUrl`, `BackupLog.hash`/`signatureValid`/`logs`, `Config.templateMailRappelSeance`/`rappelsActifs`/`rappelsHeuresAvant`/`logoBase64`/`couleurPrimaire`/`mentionsLegales`/`delaisRelancesJson`) a été résolu par la migration `20260517100000_resolve_schema_drift` (strictement additive : `ALTER TABLE ADD COLUMN` + `CREATE TABLE`).

**Règle :** chaque modification de `schema.prisma` doit générer une migration immédiatement. Ne pas accumuler de drift — `npx prisma migrate dev` ou écriture manuelle du SQL puis `npx prisma migrate deploy`.

## Champs Backup (Config)

Ajoutés par la migration `20260517063301_add_backup_retention` :

- `backupRetentionDays` (Int, défaut 30) — purge auto au-delà
- `backupMinKeep` (Int, défaut 7) — garde toujours au moins N fichiers récents

Combinés avec `backupAutoEnabled`, `backupIntervalHours`, `backupWarningThresholdDays`, `externalBackupFolder`, `backupDestinationsJson` pour piloter le scheduler dans `src/lib/backup/`.
