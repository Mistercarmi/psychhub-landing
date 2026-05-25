---
description: Crée une server action avec validation Zod, audit log et test
argument-hint: <domaine : patient|seance|facture|config|tag> <verbe : create|update|delete|list> "<description courte>"
---

Tu vas créer une nouvelle Server Action dans `src/server/<domaine>.actions.ts`.

**Arguments :** `$ARGUMENTS` — `<domaine> <verbe> "<description>"`.

## Règles non négociables (cf. `src/server/CLAUDE.md`)

1. **`"use server"`** en tête du fichier (déjà présent normalement).
2. **Validation Zod** : utilise/étend le schéma de `src/lib/validators/<domaine>.ts`.
   - Pour IBAN/SIRET/téléphone/N° sécu : utilise les helpers de `src/lib/validators/common.ts`.
3. **Audit log** pour toute mutation : passe par `withAudit()` de `src/server/with-audit.ts` (regarde un fichier existant comme `patients.actions.ts` pour le pattern).
4. **Réponse typée** : `{ ok: true, data } | { ok: false, error }`. Pas de `throw` pour les erreurs métier.
5. **Transactions Prisma** dès qu'il y a > 1 write liés (`prisma.$transaction`).
6. **Pas de leak** : ne retourne jamais `googleRefreshToken`, secrets `.env`, ou champs internes inutiles.
7. **Indexes** : avant d'écrire une requête sur grosse table, vérifie les indexes dans `prisma/schema.prisma`.

## Étapes

1. Lire l'action existante la plus proche pour copier le style.
2. Écrire / étendre le schéma Zod dans `src/lib/validators/`.
3. Écrire la server action (avec `withAudit` si mutation).
4. Écrire le test dans `src/server/__tests__/` ou `src/lib/validators/__tests__/` selon le cas.
5. Lancer `npm run typecheck && npm run test`.

Ne lance pas `npx prisma migrate` sans demander confirmation — c'est destructif sur la BD locale.
