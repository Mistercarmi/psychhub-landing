# Server Actions — règles locales

Toutes les mutations et lectures sensibles passent par ici. Un fichier par domaine : `patients.actions.ts`, `seances.actions.ts`, `factures.actions.ts`, `paiements.actions.ts`, `config.actions.ts`, `layouts.actions.ts`, `modules-data.actions.ts`, `search.actions.ts`, `audit.actions.ts`, `backup-integrity.actions.ts`, `tags.actions.ts`, `import-mapping-presets.actions.ts`, `relances.actions.ts`. Wrapper d'audit dans `with-audit.ts`.

## Règles non négociables

1. **`"use server"`** en tête de chaque fichier.
2. **Validation Zod** systématique de l'input. Schémas dans `src/lib/validators/`. Ne jamais faire confiance au client.
3. **Audit log** pour toute mutation (`patient/seance/facture/config/layout`) via `src/lib/audit.ts` (helper `withAudit` dans `with-audit.ts`). Le helper enregistre acteur + diff avant/après.
4. **Réponses typées** : retourner `{ ok: true, data } | { ok: false, error }`. Pas de `throw` pour les erreurs métier — les exceptions sont réservées aux bugs.
5. **Pas de leak de données** : ne jamais retourner le refresh token Google, les secrets `.env`, ou des champs internes non nécessaires côté client.
6. **Transactions Prisma** : utiliser `prisma.$transaction` dès qu'il y a > 1 write liés.
7. **`revalidatePath`** après chaque mutation pour rafraîchir les pages serveur concernées.

## Performance

- Toujours vérifier `prisma/schema.prisma` avant d'ajouter une requête à fort volume — il y a 26 indexes. Les plus utilisés :

| Table | Indexes |
|---|---|
| `Patient` | `[nom, prenom]`, `[email]`, `[actif]` |
| `Seance` | `[date]`, `[patientId]`, `[statut, date]` |
| `Facture` | `[statut]`, `[dateEmission]`, `[patientId]` |
| `Paiement` | `[factureId]`, `[date]` |
| `AuditLog` | `[entityType, entityId]`, `[createdAt]` |
| `BackupLog` | `[createdAt]`, `[type]` |

Si une nouvelle requête fréquente filtre sur un champ non indexé → ajouter `@@index` + migration.

- `search.actions.ts` doit rester < 200 ms cross-table — pas de N+1, pagination obligatoire.
- `modules-data.actions.ts` alimente le dashboard : un seul round-trip par onglet, pas un par module.

## Sécurité

- Aucune route ne doit exposer la liste complète des patients sans filtre.
- Les server actions appelées depuis l'API publique (`app/api/`) doivent re-vérifier auth/contexte — ne pas supposer que l'appelant est trusted.

## Libellés pour l'UI

Quand une action retourne un statut (facture, séance, etc.) consommé par l'UI, **ne pas** retourner le label déjà formaté. Retourner la clé brute (`"BROUILLON"`, `"PLANIFIEE"`) et laisser le composant client appliquer le helper de libellé :

- Factures → `factureStatutLabel/Variant/Help` depuis `src/lib/factures/statut-labels.ts`
- Séances → `getStatutVisual` / `SEANCE_STATUT_VISUALS` depuis `src/lib/seance-colors.ts`
- Modes de paiement → `modePaiementLabel` / `MODE_LABEL` (même fichier statut-labels)

Ça permet de changer les libellés sans toucher au serveur ni invalider les caches.
