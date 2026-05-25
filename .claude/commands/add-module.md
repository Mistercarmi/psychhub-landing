---
description: Scaffold un nouveau module pour le mode éditeur (composant + registry + i18n + test)
argument-hint: <id-kebab-case> <catégorie : kpi|charts|listes|utils> "<titre humain>"
---

Tu vas créer un nouveau module pour l'éditeur WYSIWYG de PsychHub.

**Arguments :** `$ARGUMENTS` — attendu : `<id> <catégorie> "<titre>"`.
- `<id>` : kebab-case stable, jamais renommé ensuite (les layouts utilisateurs y font référence).
- `<catégorie>` : `kpi`, `charts`, `listes` ou `utils`.
- `<titre>` : libellé humain en français (sera la clé i18n).

## Étapes obligatoires

1. **Composant** dans `src/editor/modules/<catégorie>/<id>.tsx` :
   - Export par défaut un composant React qui consomme `useModulesData()` (jamais d'I/O direct).
   - Pour `charts/` : import dynamique de Recharts (`next/dynamic` avec `ssr: false`).
   - Skeleton de loading + état vide soigné.
2. **Registry** : ajouter l'entrée dans `src/editor/registry/` avec
   - `id` (stable), `title` (clé i18n), `category`, `defaultLayout` (`{ w, h, minW, minH }`),
   - éventuels `params` exposés à l'utilisateur (Zod schema).
3. **i18n** : ajouter la clé dans `src/messages/fr.json` ET `src/messages/en.json`. Pas de string en dur.
4. **Données serveur** (si nécessaire) : étendre `src/server/modules-data.actions.ts` ET `ModulesDataProvider` (`src/editor/context/`). Un seul round-trip par onglet.
5. **Test minimal** dans `src/test/` : rendu + interaction clé (au moins le cas vide).
6. **Lance `npm run typecheck` ET `npm run test`** à la fin pour vérifier.

## Règles de non-régression

- Ne casse pas la sérialisation des layouts existants (`src/editor/utils/layout-serialization.ts`).
- Si la catégorie est `charts`, garde l'import Recharts dynamique sinon le bundle client explose.
- Ne dupplique pas un module existant — relis le registry avant.

Commence par lire `src/editor/CLAUDE.md` puis le registry pour comprendre la convention exacte du projet.
