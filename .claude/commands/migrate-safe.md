---
description: Migration Prisma en 2 temps (ajout → backfill → suppression) pour éviter la casse sur BD non vide
argument-hint: "<description du changement de schéma>"
---

Tu vas planifier puis exécuter une migration **safe** sur SQLite.

**Description :** `$ARGUMENTS`

## Pourquoi en 2 temps

La BD locale (`prisma/dev.db` ou `data/psychhub.db`) contient des données patient réelles. Une migration qui renomme un champ ou supprime une colonne effacerait ces données. On procède donc en 2 temps :

1. **Migration 1 (additive)** : ajoute le nouveau champ, garde l'ancien.
2. **Code** : écrit dans les 2 champs, lit le nouveau en priorité avec fallback.
3. **Backfill** : script `tsx` qui recopie l'ancien → nouveau sur les lignes existantes.
4. **Migration 2 (suppression)** : retire l'ancien champ une fois que tout le code lit le nouveau et que le backfill a tourné.

## Procédure

1. Lis `prisma/CLAUDE.md` pour rappel des règles SQLite.
2. Décris-moi **précisément** le changement (avant/après) et le plan en 2 temps **avant** de modifier `schema.prisma`.
3. Écris la migration 1 manuellement via `npx prisma migrate dev --create-only --name <slug>` puis **édite la SQL générée** : retire tout ce qui ne fait pas partie du changement demandé (Prisma génère parfois des diffs additionnels).
4. **Ne lance jamais `npx prisma migrate reset`** sans confirmation explicite de l'utilisateur.
5. Propose un script de backfill dans `prisma/scripts/<nom>.ts` exécutable via `tsx`.
6. Mentionne ce qui reste à faire pour la phase 2 (suppression) — ne la fais pas tant que le backfill n'a pas tourné.

## Checklist finale

- [ ] Migration ne contient QUE le changement attendu (pas de drift parasite).
- [ ] Index si requête fréquente sur le nouveau champ.
- [ ] `npx prisma generate` après pour mettre à jour le client.
- [ ] Tests passent : `npm run test`.
- [ ] Le seed (`prisma/seed.ts`) reste idempotent (utilise `upsert`).
