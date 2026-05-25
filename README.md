# PsychHub

Application **locale & sécurisée** de gestion de cabinet de psychologie : patients, séances, factures, KPI, paramètres. Stack moderne avec **mode éditeur WYSIWYG** sur tous les onglets.

> Local-first · Données patient en SQLite chiffré BitLocker · Backup Google Sheets · Mode hors-ligne via PWA.

---

## Démarrage rapide (30 secondes)

```powershell
# 1. Installer les dépendances
npm install

# 2. Générer le client Prisma + migration BD
npx prisma generate
npm run db:migrate

# 3. Lancer le serveur de dev
npm run dev
# → http://localhost:3000
```

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript 5.6 (strict) |
| UI | React 18.3 + Tailwind 3.4 + Shadcn/ui (Radix) |
| State | Zustand 5 + Zundo (undo/redo) + TanStack Query 5 |
| BD | Prisma 5.20 + SQLite |
| Graphiques | Recharts 2.13 (lazy-loaded) |
| Mode éditeur | react-grid-layout 1.5 |
| Forms | React Hook Form + Zod |
| Theme | next-themes (clair/sombre/système) |
| Command palette | cmdk |
| Validations | iban + libphonenumber-js |
| Intégrations | Google Sheets (tree-shaken), Doctolib XLSX, PDF (@react-pdf) |
| i18n | FR/EN (next-intl-ready) |
| Mobile | Sidebar drawer + responsive tables |
| PWA | manifest.webmanifest + icônes SVG |

---

## Fonctionnalités

### Mode éditeur WYSIWYG (drag/drop/resize)
- Activable sur **les 6 onglets** : Dashboard, Patients, Séances, Factures, KPI, Paramètres
- Toggle via icône crayon dans la Topbar ou touche `E`
- **Catalogue de 20+ modules** : KPI, graphiques, listes, tables, notes, raccourcis, calendrier mini, titres, séparateurs
- **Drag & drop** + **resize** + **dupliquer** + **supprimer** + paramètres par module
- **Undo/Redo** illimité (50 étapes) — `Cmd+Z` / `Cmd+Shift+Z`
- **Autosave** debounced 2s + bouton sauvegarder explicite (`Cmd+S`)
- **Export/Import JSON** pour partager des layouts
- **Reset** au layout par défaut par onglet
- Layouts par défaut soignés pour chaque onglet

### UX
- **Dark mode** : clair / sombre / système (auto)
- **Command Palette** : `Cmd+K` pour navigation, recherche cross-table, actions rapides
- **Raccourcis clavier globaux** :
  - `Cmd+K` palette
  - `G+D` Dashboard, `G+P` Patients, `G+S` Séances, `G+F` Factures, `G+K` KPI, `G+,` Paramètres
  - `E` mode éditeur, `Esc` quitter
- **Recherche globale** : patients, factures, séances (cross-table, <200ms)
- **Skeleton loaders** pendant les chargements
- **Toasts** Sonner avec actions

### Mobile & PWA
- **Sidebar drawer** sur mobile (`< md` breakpoint)
- **Tables responsives** : transformées en cards empilées sous `md`
- **Installable** comme app native (PWA manifest + icônes 192/512)
- **Raccourcis** rapides depuis l'écran d'accueil

### Sécurité & RGPD
- **Validations renforcées** : IBAN (checksum mod-97), téléphone (libphonenumber), SIRET (Luhn), N° SS (clé INSEE)
- **Audit log** : trace des mutations sur Patients/Séances/Factures/Config/Layout
- **Backup Google Sheets** chiffré OAuth (refresh token jamais exporté)
- **BitLocker** : la BD SQLite est protégée par le chiffrement disque Windows
- **Tags** transverses Patient/Séance/Facture pour catégorisation

### Performance
- **Tree-shaken** : `@googleapis/sheets` + `google-auth-library` (gain ~800 KB vs `googleapis` complet)
- **Recharts lazy-loaded** uniquement dans les modules de graphique actifs
- **react-grid-layout lazy-loaded** uniquement en mode édition
- **Indexes Prisma** : composite `[statut, date]`, `[email]`, `[patientId]`, `[actif]`

---

## Architecture

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le détail.

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/              # Layout principal (sidebar + main)
│   │   ├── dashboard/      # Dashboard avec mode éditeur
│   │   ├── patients/       # CRUD patients + zone modulaire
│   │   ├── seances/        # CRUD séances + import Doctolib
│   │   ├── factures/       # CRUD factures + génération PDF
│   │   ├── kpi/            # Graphiques + KPI éditables
│   │   └── parametres/     # Config + Google Sheets sync
│   ├── api/                # Routes API (OAuth, import, mail, pdf)
│   ├── layout.tsx          # ThemeProvider + GlobalShortcuts
│   ├── providers.tsx       # React Query + Sonner
│   └── globals.css         # Variables CSS (light + dark)
├── components/
│   ├── editor/             # PageWithEditor wrapper
│   ├── layout/             # Sidebar (avec drawer mobile), Topbar
│   ├── shared/             # CommandMenu, GlobalShortcuts, ResponsiveTable
│   ├── theme/              # ThemeProvider, ThemeToggle
│   ├── ui/                 # Shadcn primitives (Card, Button, Sheet, ...)
│   ├── patients/, seances/, factures/, parametres/, kpi/
├── editor/                 # ⭐ Cœur du mode éditeur
│   ├── store/              # Zustand store + zundo middleware
│   ├── registry/           # Module registry + bootstrap
│   ├── modules/            # 20+ modules organisés par catégorie
│   │   ├── kpi/            # 11 modules KPI
│   │   ├── charts/         # 3 charts Recharts (lazy)
│   │   ├── listes/         # 4 listes (séances, factures, anniversaires)
│   │   └── utils/          # heading, divider, note, raccourci, mini-calendrier
│   ├── components/         # EditorCanvas, ModulePalette, ModuleWrapper, ...
│   ├── hooks/              # useAutosaveLayout, useKeyboardShortcuts, ...
│   ├── context/            # ModulesDataProvider (SSR → modules)
│   └── utils/              # layout-defaults, layout-serialization, grid-math
├── server/                 # Server Actions
│   ├── layouts.actions.ts  # CRUD layouts personnalisés
│   ├── modules-data.actions.ts # Data loaders par onglet
│   ├── search.actions.ts   # Recherche globale cross-table
│   ├── audit.actions.ts    # Audit log lecture
│   ├── patients.actions.ts, seances.actions.ts, factures.actions.ts, config.actions.ts
├── lib/                    # Utilitaires
│   ├── db.ts               # Prisma client
│   ├── audit.ts            # Helper d'audit log
│   ├── i18n.ts             # Helper i18n FR/EN
│   ├── validators/         # Schemas Zod (avec common.ts IBAN/téléphone/SIRET/SS)
│   ├── google/             # OAuth + Sheets sync (tree-shaken)
│   └── excel/              # Parseur Doctolib XLSX
├── messages/               # Traductions JSON
│   ├── fr.json
│   └── en.json
└── stores/                 # Stores Zustand globaux (UI palette open, etc.)
```

---

## Commandes

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement (http://localhost:3000) |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production (après build) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Générer le client Prisma |
| `npm run db:migrate` | Appliquer les migrations Prisma |
| `npm run db:seed` | Insérer les données de seed |
| `npm run db:studio` | Ouvrir Prisma Studio |

---

## Variables d'environnement

Créez `.env.local` à la racine :

```ini
# Base de données
DATABASE_URL="file:./prisma/dev.db"

# Google OAuth (optionnel — pour backup Sheets)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google/callback"
```

---

## Documentation complémentaire

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — décisions structurantes et schéma de couches
- [docs/EDITOR_GUIDE.md](docs/EDITOR_GUIDE.md) — guide utilisateur du mode éditeur

---

## Crédits

PsychHub est conçu pour un cabinet **solo de psychologie**, en pensant à la **simplicité** et la **confidentialité** des données patient.
