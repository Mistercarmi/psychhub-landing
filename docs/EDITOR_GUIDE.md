# Guide du Mode Éditeur

Personnalisez **chaque onglet** de PsychHub à votre flux de travail réel. Drag & drop, redimensionnement, ajout/suppression de modules en quelques clics.

---

## Activer le mode éditeur

3 façons :
1. Clic sur **Éditer** (icône crayon) dans la barre du haut.
2. Touche **`E`** sur le clavier (hors champ texte).
3. Via **Cmd+K** → « Activer le mode éditeur ».

Un indicateur orange apparaît sur le bouton « Éditer » dès qu'il y a des modifications non sauvegardées.

---

## Ajouter un module

- En mode édition, la palette s'ouvre automatiquement à gauche.
- Modules classés par catégorie : **KPI**, **Graphiques**, **Tables**, **Listes**, **Utilitaires**.
- Cliquez sur un module → il apparaît dans une zone libre de la grille.
- La palette ne montre que les modules **compatibles avec l'onglet** courant.

### Modules disponibles (catalogue)

| Catégorie | Module | Description |
|---|---|---|
| KPI | Patients actifs | Compteur de patients actifs |
| KPI | CA du mois | Chiffre d'affaires du mois |
| KPI | CA cumulé (année) | CA depuis le 1er janvier |
| KPI | CA prévisionnel | Somme des séances planifiées |
| KPI | Factures en retard | Compteur en retard |
| KPI | Factures impayées | Total ou compte impayé |
| KPI | Taux d'annulation | Moyenne année |
| KPI | Séances ce mois | Total tous statuts |
| KPI | Nouveaux patients (mois) | Patients créés ce mois |
| KPI | Patients inactifs | Compteur d'inactifs |
| KPI | Statut application | Badge texte libre |
| Charts | CA par mois | Bar chart 12 mois |
| Charts | Répartition patients | Pie chart top 5 + autres |
| Charts | Taux d'annulation | Line chart 12 mois |
| Listes | Prochaines séances | Liste compacte planifiées |
| Listes | Prochaines séances (détail) | Liste détaillée tous statuts |
| Listes | Anniversaires patients | 60 prochains jours |
| Listes | Factures récentes | Dernières émissions |
| Utils | Note libre | Mémo texte (5 couleurs) |
| Utils | Titre | Section heading H1/H2/H3 |
| Utils | Séparateur | Ligne horizontale |
| Utils | Raccourci | Bouton vers une route |
| Utils | Mini calendrier | Mois courant |

---

## Déplacer un module

- Survolez le module → un badge **« Déplacer »** apparaît en haut à gauche.
- Cliquez-déposez ce badge pour repositionner.
- La grille est de **12 colonnes** ; les modules s'alignent automatiquement.

---

## Redimensionner

- Survolez le module → une poignée diagonale apparaît en bas à droite.
- Cliquez-tirez pour redimensionner.
- Les bornes `minSize` et `maxSize` sont définies par module.

---

## Modifier un module

- Survolez le module → icône **engrenage** en haut à droite.
- Clic → drawer paramètres à droite.
- Modifiez le titre, le label, la limite (selon le module) → **Appliquer**.

Exemples :
- **Liste anniversaires** : ajustez `limit` (1-20).
- **Note libre** : choisissez la couleur (default / teal / amber / rose / slate) et le contenu.
- **Raccourci** : configurez `label`, `description`, `href`.
- **Mini-calendrier** : changez le titre affiché.
- **Heading** : choisissez le niveau (h1/h2/h3).

---

## Dupliquer / Supprimer

- Survolez le module → icônes **copie** et **corbeille** en haut à droite.
- Suppression demande confirmation.

---

## Sauvegarder

- **Autosave** : toutes les modifications sont automatiquement sauvegardées 2s après la dernière action.
- **Sauvegarde manuelle** : `Cmd+S` ou bouton **Sauvegarder** dans la toolbar flottante.
- **Indicateur dirty** : point orange sur le bouton « Éditer » s'il reste des changements à sauvegarder.

---

## Annuler / Refaire

- `Cmd+Z` annule la dernière action (drag, resize, add, remove, edit).
- `Cmd+Shift+Z` refait.
- Historique de **50 étapes**.

---

## Export / Import

- **Exporter** : toolbar flottante → icône **téléchargement**. Téléchargement d'un fichier `.json`.
- **Importer** : icône **upload**, sélection d'un `.json` exporté. Remplace le layout courant.

Permet de **partager** un layout entre cabinets ou de **versionner** une configuration.

---

## Réinitialiser

- Toolbar flottante → icône **rotation**.
- Confirmation requise.
- Restaure le layout par défaut (différent par onglet).

---

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| `E` | Bascule mode éditeur |
| `Cmd+S` | Sauvegarde explicite |
| `Cmd+Z` / `Cmd+Shift+Z` | Annuler / Refaire |
| `Esc` | Fermer settings drawer, puis quitter mode éditeur |
| `Cmd+K` | Command palette (recherche + nav) |
| `G+D/P/S/F/K/,` | Navigation rapide vers Dashboard/Patients/Séances/Factures/KPI/Paramètres |

---

## Quels onglets supportent le mode éditeur ?

**Tous les 6 onglets** :

- **Dashboard, KPI** : 100% modulaire. Les modules remplacent le contenu legacy si vous sauvegardez un layout.
- **Patients, Séances, Factures, Paramètres** : le contenu CRUD (table, formulaire) **reste toujours visible**. La zone modulaire vient s'ajouter au-dessus. Idéal pour KPI rapides, raccourcis, notes.

---

## FAQ

**Q : Si je supprime tous les modules d'un onglet, que se passe-t-il ?**
R : Le layout reste sauvegardé avec 0 modules. La zone éditeur est vide mais existe.
Pour revenir à l'état "comme avant la première édition", utilisez **Réinitialiser**.

**Q : Mes modifications sont-elles partagées entre appareils ?**
R : Non — actuellement, le layout est stocké en local. Le backup Google Sheets ne synchronise pas encore les layouts (prévu plus tard).

**Q : Puis-je avoir plusieurs layouts par onglet ?**
R : Pas dans l'UI actuelle, mais le schéma BD supporte plusieurs `Layout` par `(tabKey, name)`. Fonctionnalité « presets » prévue dans une prochaine itération.

**Q : Le drag/resize est lent sur de grands écrans ?**
R : Plus de 30 modules sur un même onglet peut ralentir. Recommandation : 10-15 modules par onglet pour confort.
