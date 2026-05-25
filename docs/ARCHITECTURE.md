# Architecture PsychHub

Ce document décrit l'architecture cible de PsychHub après la refonte P1→P4.

---

## Vue d'ensemble

PsychHub est une application **Next.js 14 (App Router)** locale-first, avec une couche **WYSIWYG personnalisable** par-dessus chaque onglet métier. L'invariant principal : **rétrocompatibilité visuelle stricte** — sans layout custom, le rendu est identique au JSX legacy.

### Schéma de couches

```
┌────────────────────────────────────────────┐
│  Pages (Server Components, async)          │ ← chargent data + initialLayout
│  ↓                                          │
│  PageWithEditor (Client wrapper)           │ ← décide rendu legacy vs éditeur
│  ├─ if editMode  → EditorCanvas (RGL lazy) │ ← drag/drop/resize
│  ├─ if custom    → GridRenderer (CSS Grid) │ ← rendu statique
│  └─ else         → fallback (JSX legacy)   │ ← invariant rétrocompat
│  ↓                                          │
│  Modules (Client, via Module Registry)     │ ← composants atomiques
│  ↓                                          │
│  ModulesDataContext (SSR → Client)         │ ← données pré-chargées
└────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────┐
│  Server Actions ("use server")             │
│  ├─ layouts.actions.ts                     │ ← CRUD layouts
│  ├─ modules-data.actions.ts                │ ← data loaders
│  ├─ search.actions.ts                      │ ← recherche globale
│  └─ patients/seances/factures/audit       │ ← métier
└────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────┐
│  Prisma + SQLite                           │
│  ├─ Patient, Seance, Facture, Config       │ ← métier
│  ├─ Layout, LayoutPreset                   │ ← mode éditeur
│  ├─ Tag, PatientTag, SeanceTag, FactureTag │ ← catégorisation
│  ├─ AuditLog                               │ ← RGPD
│  └─ SeanceTemplate                         │ ← templates réutilisables
└────────────────────────────────────────────┘
```

---

## Mode éditeur — concepts clés

### Module (Type)
Définition statique en code dans `src/editor/modules/<category>/<name>.module.tsx`. Forme :

```ts
{
  key: string,                  // identifiant unique persisté en BD
  name: string,                 // libellé palette
  description: string,
  category: "KPI" | "Charts" | "Tables" | "Listes" | "Utils",
  icon: LucideIcon,
  defaultSize: { w, h },
  minSize: { w, h },
  maxSize?: { w, h },
  defaultProps: TProps,         // props initiales
  configSchema: z.ZodType,      // validation des props éditables
  component: ComponentType,     // le rendu React du module
  compatibleTabs?: TabKey[]     // restriction d'apparition dans la palette
}
```

Le module reçoit `{ moduleId, props, isEditing }` et lit ses données via `useTabData<T>(tab)` depuis le `ModulesDataContext` hydraté côté serveur.

### Layout (Instance)
Persisté en BD (`prisma.layout`) :

```ts
{
  id, tabKey, name, isDefault, userId,
  modules: ModuleConfig[],   // JSON : [{ id, type, gridPosition, props, visible }]
  gridConfig,                // JSON : { cols, rowHeight, gap, compactType }
  schemaVersion              // version du format pour migrations futures
}
```

### Registry
`src/editor/registry/module-registry.ts` expose `registerModule`, `getModule`, `getModulesForTab`. Le bootstrap (`register-all.ts`) enregistre tous les modules au chargement. La palette affiche uniquement les modules dont `compatibleTabs` inclut l'onglet courant.

### Editor Store (Zustand + Zundo)
`src/editor/store/editor-store.ts` :
- `editMode`, `currentTab`, `layout`, `dirty`, `isPaletteOpen`, `selectedModuleId`, `isSettingsOpen`
- Actions : `addModule`, `removeModule`, `duplicateModule`, `updateModuleProps`, `applyGridChanges`
- Undo/Redo via middleware `zundo` (`temporal`, limit 50, partialize sur `layout`)

### Flow d'un drag
```
User drag handle .module-drag-handle
  → react-grid-layout calcule placeholder
  → onDragStop({ newLayout })
  → store.applyGridChanges(newLayout)
  → state.dirty = true, state.layout updated
  → useAutosaveLayout debounced 2s → saveLayout Server Action
  → markClean()
```

---

## Décisions structurantes (ADRs résumés)

### ADR 1 : Zustand + Zundo plutôt que Redux
- API minimaliste, pas de boilerplate
- Middleware `temporal` natif pour undo/redo
- Sélecteurs fins → pas de re-render parasite pendant le drag
- ⚠️ pas de devtools temporal officiels — acceptable pour P1-P4

### ADR 2 : react-grid-layout plutôt que dnd-kit / gridstack
- Mature, sérialisation JSON triviale
- Supporte drag + resize nativement
- Lazy-loaded uniquement en mode édition (gain bundle)
- ⚠️ ~80 KB gzip — acceptable car opt-in

### ADR 3 : Prisma + SQLite plutôt que localStorage seul
- BD source de vérité, exportable, sauvegardable Google Sheets
- Champ `userId` nullable prévu pour multi-user futur
- localStorage non utilisé — l'autosave 2s suffit

### ADR 4 : Fallback statique strict
- Pages = Server Components qui hydratent un Client wrapper
- Tant qu'aucun `Layout` BD n'existe ET mode édition OFF → rend JSX legacy
- Garantit zéro régression visuelle pour l'utilisateur qui ignore le mode

### ADR 5 : Tree-shake googleapis → @googleapis/sheets + google-auth-library
- Gain estimé ~800 KB côté serveur cold-start
- API quasi-identique, swap minimal

### ADR 6 : Pas de NextAuth en P1-P4 (mono-user)
- L'app cible un cabinet solo. Schéma `Layout.userId` préparé pour évolution future.
- Si multi-user nécessaire : ajouter `User` model + Auth.js v5 + filtre `userId` sur tous les queries.

---

## Sécurité

| Aspect | Approche |
|---|---|
| Données patient sensibles | SQLite local + BitLocker (chiffrement disque Windows) |
| Refresh token Google | Stocké uniquement en BD locale, JAMAIS exporté dans le backup Sheets |
| Validations input | Zod renforcé : IBAN mod-97, téléphone libphonenumber, SIRET Luhn, N° SS clé INSEE |
| Audit | `AuditLog` model tracking CREATE/UPDATE/DELETE/READ_SENSITIVE |
| Future : chiffrement field-level | Planifié pour P3+ via AES-256-GCM sur `numeroSecu`, `notesCliniques`, `adresse` |

---

## Performance

- **Bundle splitting** : RGL + Framer Motion lazy-loaded uniquement en mode éditeur
- **Recharts lazy** : chaque module chart utilise `next/dynamic` avec `ssr: false`
- **React Query** : `staleTime: 30s`, pas de refetch on focus
- **Indexes Prisma** : `[email]`, `[actif]`, composite `[statut, date]`, `[patientId]`
- **Pagination** : prévue P3+ via Server Actions `list*({ page, pageSize })`

---

## Roadmap future (post-P4)

- Chiffrement AES-256-GCM des champs sensibles
- Service Worker @serwist + IndexedDB (Dexie) pour mode offline complet
- Notes patient rich text (TipTap)
- Export PDF batch (déclaration URSSAF) via jszip
- Tests Vitest + Playwright + CI GitHub Actions
- Migration multi-user avec NextAuth si besoin
