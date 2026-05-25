---
description: Vérifie la santé du projet (lint, typecheck, tests, intégrité BD)
---

Lance dans cet ordre et arrête-toi à la première erreur en m'expliquant clairement ce qui est cassé :

1. `npm run lint` — ESLint sur le projet
2. `npm run typecheck` — TypeScript `--noEmit`
3. `npm run test` — Vitest (suite complète)
4. `npx prisma validate` — schéma Prisma valide
5. **Intégrité BD** : importe et appelle `runDatabaseIntegrityCheck()` depuis `src/server/backup-integrity.actions.ts` via un mini-script `tsx -e`, ou vérifie qu'aucun BackupLog récent n'a `signatureValid: false`.

Si tout passe, fais un résumé court :
- nombre de fichiers TS
- nombre de tests
- date du dernier backup réussi (lis `BackupLog` via Prisma si possible)
- taille de `prisma/dev.db` ou `data/psychhub.db`
- état de santé du backup (`getBackupHealth()` dans `src/lib/backup/service.ts`)

Sinon, propose un plan de remédiation pour la première erreur trouvée.
