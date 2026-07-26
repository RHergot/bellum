# Implementation Specification: Bellum — Tactical Game with ISMCTS AI

## 1. Architecture Overview

- **Backend**: Django 6.0 + Django REST Framework (DRF) 3.17
  - Gère l'état du jeu, les règles, le Fog of War (information cachée), et le moteur IA.
  - Stockage **en mémoire** (`ACTIVE_GAMES` dict) — pas de persistence DB.
- **Frontend**: Vue 3 + Vite 8 + TypeScript + Tailwind CSS (CDN)
  - Interface tactique avec 2 vues distinctes (Player vs AI / split-screen).
- **Process Management**: PM2 (`ecosystem.config.cjs`)
  - Backend Django via `runserver` sur port 8000, frontend Vite dev server sur port 5173.

### Statut actuel

| Composant | Statut | Notes |
|-----------|--------|-------|
| Django + DRF | ✅ Implémenté | APIViews directes, pas de serializers |
| `stratego_logic.py` | ✅ Implémenté | Règles de combat complètes, Fog of War ok |
| `ismcts.py` | ⚠️ Simplifié | Determinization = stub, pas de vrai MCTS |
| Frontend Vue 3 | ✅ Implémenté | Composant monolithique `App.vue` |
| CORS | ❌ Absent | `django-cors-headers` non installé |
| Validation des moves | ✅ Implémenté | `_validate_move()` complet (range, lake, ownership, légalité) |
| Persistence | ❌ Absente | `ACTIVE_GAMES` en mémoire uniquement |
| **Placement manuel** | ❌ Absent | Auto-placement uniquement |

---

## 2. Nouvelle Fonctionnalité : Placement Manuel des Pièces

### 2.1 Objectif

Permettre au joueur de choisir entre :
- **Placement aléatoire** (comportement actuel) — les 40 pièces sont distribuées aléatoirement sur les 4 rangées
- **Placement manuel** — le joueur dispose ses pièces une par une sur sa zone de déploiement

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vue 3)                         │
│                                                                  │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │ PlacementMode │   │  PlacementGrid   │   │  PiecePalette  │  │
│  │ Selector      │   │  (grille 10×10   │   │  (pièces        │  │
│  │ (aléatoire /   │   │   avec zone de   │   │   restantes à  │  │
│  │  manuel)       │   │   déploiement    │   │   placer)      │  │
│  │                │   │   highlightée)   │   │                │  │
│  └──────────────┘   └──────────────────┘   └────────────────┘  │
│                                                                  │
│  Phase 'placement': le joueur pose ses 40 pièces                │
│  Phase 'battle':    combat normal (existant)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Django DRF)                         │
│                                                                  │
│  POST /api/game/new/                                             │
│    body: { placement_mode: 'random' | 'manual',                  │
│            manual_placement?: [40 x {r, c, piece}] }             │
│                                                                  │
│  Si 'random' → comportement actuel (create_army_pieces)         │
│  Si 'manual' → valider le placement, placer les pièces          │
│                                                                  │
│  Validation manuelle:                                            │
│    - 40 pièces exactement                                        │
│    - Toutes dans les 4 rangées du joueur (6-9 pour P1)          │
│    - Pas de doublons de coordonnées                              │
│    - Pièces valides (clés connues)                               │
│    - Quantités respectées (1 Marshal, 1 General, 2 Colonels...) │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Flux utilisateur

```
1. Le joueur clique « Nouvelle Partie »
2. Un sélecteur apparaît : [Aléatoire] [Placement Manuel]
3a. Si Aléatoire → jeu lancé directement (comportement actuel)
3b. Si Manuel → phase de placement :
    - La zone de déploiement (rangées 6-9, 4×10 = 40 cases) est mise en évidence
    - Un panneau « Pièces à placer » affiche les 40 pièces restantes, groupées par type
    - Le joueur clique une pièce → elle est « en main »
    - Le joueur clique une case cible → la pièce s'y transfère

    Gestes possibles (3 sources × 2 cibles) :

    ┌─────────────────┬──────────────────────┬──────────────────────┐
    │   CLIC SUR...   │  → Case vide grille  │  → Case occupée      │
    │                 │                      │    (sa propre pièce) │
    ├─────────────────┼──────────────────────┼──────────────────────┤
    │ Pièce palette   │  PLACER              │  ÉCHANGER            │
    │                 │  palette → grille    │  palette ⇄ grille    │
    ├─────────────────┼──────────────────────┼──────────────────────┤
    │ Pièce grille    │  DÉPLACER            │  PRENDRE EN MAIN     │
    │                 │  grille → grille     │  (la nouvelle pièce) │
    ├─────────────────┼──────────────────────┼──────────────────────┤
    │ Case vide       │  (rien)              │  —                    │
    └─────────────────┴──────────────────────┴──────────────────────┘

    Retour au pool :
    - Clic droit sur une pièce de la grille → retourne dans la palette
    - Ou : sélectionner une pièce grille, puis cliquer sur son type dans la palette
    - Ou : bouton « Vider » qui remet tout dans le pool

    - Compteur « 12/40 » mis à jour en temps réel
    - Bouton « ✅ Confirmer » actif seulement à 40/40
4. Le placement est envoyé au backend → validation → partie lancée
```

### 2.4 Composants frontend

| Composant | Rôle | Statut |
|-----------|------|--------|
| `PlacementModeSelector` | Boutons Aléatoire / Manuel | Nouveau |
| `PlacementGrid` | Grille 10×10 avec zone de déploiement, rendu Canvas | Nouveau |
| `PiecePalette` | Liste des pièces disponibles, groupées par type | Nouveau |
| `usePlacement` (composable) | Logique de placement : sélection, pose, déplacement, échange, retour pool | Nouveau |
| `useGame.ts` (existant) | Intégration du composable placement + envoi backend | Modifié |
| `App.vue` | Layout conditionnel (sélecteur → placement → battle) | Modifié |

### 2.5 Endpoints API modifiés

| Méthode | Route | Changement |
|---------|-------|------------|
| POST | `/api/game/new/` | Ajout du body `{ placement_mode, manual_placement? }` |

Pas de nouvel endpoint — le mode de placement est un paramètre de création.

### 2.6 Modèle de données

```typescript
// État de placement côté frontend
interface PlacementState {
  mode: 'random' | 'manual'
  piecesInPool: PieceCount[]        // pièces encore dans la palette
  piecesOnGrid: GridPiece[]         // pièces déjà posées sur la grille
  inHand: InHandPiece | null        // pièce actuellement « en main »
}

// Une pièce dans la palette (pool)
interface PieceCount {
  key: string      // 'marshal', 'general', ...
  name: string     // 'Marshal', 'General', ...
  rank: number     // 10, 9, 8, ...
  emoji: string    // '⭐', ...
  remaining: number
}

// Une pièce posée sur la grille
interface GridPiece {
  r: number
  c: number
  piece: string    // key de la pièce
}

// Pièce « en main » — savoir D'OÙ elle vient
interface InHandPiece {
  key: string
  source: 'pool' | { r: number; c: number }  // palette ou case de la grille
}
```

**Pourquoi `InHandPiece.source` ?** Pour implémenter le flux bidirectionnel :

| Action | inHand.source | Clic cible | Résultat |
|--------|:---:|---|---|
| Prendre dans palette | `'pool'` | Case vide | Retire du pool, pose sur grille |
| Prendre dans palette | `'pool'` | Case occupée | Échange : pièce grille → pool, pièce pool → grille |
| Prendre sur grille | `{r,c}` | Case vide | Déplace : ancienne case vidée, nouvelle occupée |
| Prendre sur grille | `{r,c}` | Case occupée | Prend la nouvelle pièce en main (l'ancienne reste où elle est — on vient de changer d'avis) |
| Clic droit sur grille | — | Pièce | Retourne au pool (sans passer par « en main ») |

### 2.6b Logique du composable `usePlacement`

```typescript
// usePlacement.ts — logique réactive de placement bidirectionnel

const pool = reactive<PieceCount[]>(buildInitialPool())   // 40 pièces
const grid = reactive<GridPiece[]>([])                     // vide au début
const inHand = ref<InHandPiece | null>(null)

// ─── PRENDRE UNE PIÈCE ───

function pickFromPool(key: string) {
  // Depuis la palette → « en main »
  const entry = pool.find(p => p.key === key)
  if (!entry || entry.remaining <= 0) return
  entry.remaining--
  inHand.value = { key, source: 'pool' }
}

function pickFromGrid(r: number, c: number) {
  // Depuis la grille → « en main », la case se vide
  const piece = grid.find(p => p.r === r && p.c === c)
  if (!piece) return
  grid.splice(grid.indexOf(piece), 1)
  inHand.value = { key: piece.piece, source: { r, c } }
}

// ─── POSER / DÉPLACER / ÉCHANGER ───

function placeOnCell(r: number, c: number) {
  if (!inHand.value || !isDeploymentZone(r, c)) return

  const existing = grid.find(p => p.r === r && p.c === c)

  if (existing) {
    // Case occupée → ÉCHANGE
    if (inHand.value.source === 'pool') {
      // pool → grille, ET grille → pool
      grid.splice(grid.indexOf(existing), 1, { r, c, piece: inHand.value.key })
      const entry = pool.find(p => p.key === existing.piece)
      if (entry) entry.remaining++
      inHand.value = null
    } else {
      // grille → grille occupée : on change d'avis, on prend la nouvelle pièce
      returnToGridSource()       // ancienne pièce retourne à sa case
      pickFromGrid(r, c)          // nouvelle pièce prise en main
    }
  } else {
    // Case vide → PLACER ou DÉPLACER
    grid.push({ r, c, piece: inHand.value.key })
    inHand.value = null
  }
}

// ─── RETOUR AU POOL ───

function returnToPool(r: number, c: number) {
  // Clic droit : grille → pool (sans passer par « en main »)
  const piece = grid.find(p => p.r === r && p.c === c)
  if (!piece) return
  grid.splice(grid.indexOf(piece), 1)
  const entry = pool.find(p => p.key === piece.piece)
  if (entry) entry.remaining++
}

function returnToGridSource() {
  // Remet la pièce « en main » à sa case d'origine
  if (!inHand.value || inHand.value.source === 'pool') return
  const { r, c } = inHand.value.source
  grid.push({ r, c, piece: inHand.value.key })
  inHand.value = null
}

function clearAll() {
  // Bouton « Vider » : tout retourne au pool
  for (const piece of grid) {
    const entry = pool.find(p => p.key === piece.piece)
    if (entry) entry.remaining++
  }
  grid.length = 0
  inHand.value = null
}

// ─── COMPUTED ───

const placedCount = computed(() => grid.length)
const canConfirm = computed(() => grid.length === 40)
```

### 2.7 Validation backend

```python
def _validate_manual_placement(placement, player):
    """
    Valide un placement manuel. Retourne (is_valid, error_message).
    Règles :
    - Exactement 40 pièces
    - Toutes dans les rangées 6-9 (P1) ou 0-3 (P2)
    - Coordonnées uniques (pas de doublons)
    - Pièces valides (clés dans PIECES_CONFIG)
    - Quantités exactes par type
    """
```

### 2.8 Sécurité

- Validation stricte côté backend (ne jamais faire confiance au frontend)
- Les coordonnées sont validées avant toute écriture dans la grille
- Le token joueur est vérifié (réutilisation de `_authenticate_player`)
- Pas de fuite d'information : le placement ennemi reste masqué

### 2.9 Fichiers impactés

```
backend/game_engine/
├── views.py              # Modifié : NewGameAPIView accepte placement_mode
├── stratego_logic.py     # Modifié : ajout _validate_manual_placement()
└── tests.py              # Modifié : tests de validation de placement

frontend/src/
├── types/game.ts         # Modifié : types PlacementState, PieceCount, PlacedPiece
├── composables/useGame.ts # Modifié : logique de placement
├── App.vue               # Modifié : layout conditionnel (placement vs battle)
└── components/
    ├── PlacementModeSelector.vue  # Nouveau
    ├── PlacementGrid.vue          # Nouveau
    └── PiecePalette.vue           # Nouveau
```

---

## 3. Core Game Rules & Mechanics

- **Board**: 10×10 avec 8 cases lac (obstacles infranchissables).
- **Pieces & Ranks**:

| Pièce    | Rang | Qté |
|----------|------|-----|
| Marshal  | 10   | 1   |
| General  | 9    | 1   |
| Colonel  | 8    | 2   |
| Major    | 7    | 3   |
| Captain  | 6    | 4   |
| Lieutenant | 5  | 4   |
| Sergeant | 4    | 4   |
| Miner    | 3    | 5   |
| Scout    | 2    | 8   |
| Spy      | 1    | 1   |
| Flag     | 0    | 1   |
| Bomb     | -1   | 6   |

- **Hidden Information (Fog of War)**:
  - `to_dict(for_player=N)` masque les pièces ennemies non révélées → `'unknown'`.
  - ✅ Implémenté correctement.
- **Combat Resolution**:
  - Rang supérieur gagne. Égalité = destruction mutuelle.
  - Cas spéciaux : Mineur (3) vs Bombe → Mineur gagne. Spy (1) vs Marshal (10) → Spy gagne.
  - Drapeau capturé → victoire immédiate.
  - ✅ Implémenté dans `stratego_logic.py:resolve_combat()`.

---

## 4. AI Engine (ISMCTS — simplifié)

### Implémentation réelle vs spécification

| Fonctionnalité | Spécifié | Implémenté |
|---------------|----------|------------|
| Determinization (randomisation des pièces ennemies inconnues) | ✅ | ❌ Stub — `deepcopy` sans randomisation |
| Sélection UCT (Upper Confidence Bound for Trees) | ✅ | ❌ Pas d'arbre, pas d'UCT |
| Expansion / Rollout / Backpropagation | ✅ | ❌ Simple évaluation 1-coup |
| Heuristique d'évaluation | ✅ | ✅ Balance matérielle basique (`evaluate_board`) |
| Génération de moves légaux | ✅ | ✅ `get_legal_moves` avec scout multi-step |

---

## 5. API Endpoints

### Endpoints implémentés

| Méthode | Route | Description | Statut |
|---------|-------|-------------|--------|
| POST | `/api/game/new/` | Nouvelle partie avec placement auto ou manuel | ✅ (auto) / 🔄 (manuel à ajouter) |
| GET | `/api/game/<id>/state/?player=N` | État visible pour le joueur N | ✅ |
| POST | `/api/game/<id>/move/` | Jouer un coup (P1) + contre-coup IA (P2) | ✅ |

---

## 6. Frontend (Vue 3 + TypeScript)

### Implémenté
- Grille 10×10 interactive avec click-to-move
- Split-screen : perspective Joueur 1 (gauche) + perspective IA/Joueur 2 (droite)
- Fog of War visuel : pièces ennemies masquées (🛡️), pièces révélées affichées
- Sélection visuelle (anneau jaune) et feedback de statut

### Limitations
- Composant **monolithique** : tout dans `App.vue` (166 lignes) — pas de composants réutilisables
- **Pas d'interfaces TypeScript** : utilisation de `any` partout
- **URLs hardcodées** : `http://localhost:8000` en dur (×4 occurrences)
- **Pas d'état de chargement** ni de gestion d'erreur HTTP (`res.ok` non vérifié)
- **Double appel API** à l'initialisation : fetch P1 puis fetch P2 séparément
- **Tailwind CDN** en production non idéal — devrait être intégré au build Vite

---

## 7. Configuration & Déploiement

### PM2 (`ecosystem.config.cjs`)
```javascript
// Backend : runserver (dev) — devrait utiliser gunicorn en production
// Frontend : npm run dev (dev) — devrait utiliser un build statique servi par nginx/Caddy
```

### Django Settings (`settings.py`)
- `SECRET_KEY` : en dur dans le code source ⚠️
- `DEBUG = True` ⚠️
- `ALLOWED_HOSTS = []` ⚠️
- Pas de `django-cors-headers` ⚠️

---

## 8. Prochaines étapes (priorisées)

| Priorité | Tâche | Statut |
|----------|-------|--------|
| 🔴 P0 | **Placement manuel des pièces** (cette spec) | 📋 Spec |
| 🔴 P0 | CORS (`django-cors-headers`) | ❌ |
| 🔴 P0 | `determinize()` ISMCTS (randomisation) | ❌ |
| 🟡 P1 | Sécurisation Django (SECRET_KEY, DEBUG, ALLOWED_HOSTS) | ❌ |
| 🟡 P1 | `.gitignore` + `requirements.txt` | ❌ |
| 🟡 P1 | Configuration d'environnement frontend | ❌ |
| 🟢 P2 | Découpage composants Vue + interfaces TS | ❌ |
| 🟢 P2 | Persistence DB | ❌ |
| 🟢 P2 | ISMCTS complet (UCT, arbre, rollouts) | ❌ |
| 🟢 P3 | Productionisation (gunicorn, build statique) | ❌ |
