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
| Validation des moves | ❌ Absente | L'API accepte toutes les coordonnées |
| Persistence | ❌ Absente | `ACTIVE_GAMES` en mémoire uniquement |

---

## 1b. Multi-Player & Dual-Screen Architecture (à implémenter)

### Principe

Chaque joueur est sur un PC/navigateur différent et ne voit **que sa perspective** (ses pièces + les pièces ennemies révélées). L'API le permet déjà via `to_dict(for_player=N)`.

### Ce qui existe déjà
- `GET /api/game/<id>/state/?player=1` → vue filtrée Joueur 1
- `GET /api/game/<id>/state/?player=2` → vue filtrée Joueur 2
- Chaque réponse masque les pièces adverses non révélées (`'unknown'`)

### Ce qui manque

| Fonctionnalité | Description |
|---------------|-------------|
| **Rejoindre une partie** | `POST /api/game/<id>/join/` → associe un joueur à une partie existante (UUID ou token) |
| **Mode de jeu** | Sélecteur : `mode: 'vs_ai'` ou `mode: 'vs_human'` |
| **Tour par tour réseau** | Quand c'est le tour de P2 humain, son client doit recevoir l'état mis à jour (polling ou WebSocket) |
| **Frontend mono-perspective** | Chaque client n'affiche qu'UNE grille (sa perspective), pas le split-screen actuel |
| **Détection de tour** | Le backend doit renvoyer `current_turn: 1` ou `2` pour que le client sache si c'est à lui de jouer |
| **Partage du game_id** | Mécanisme pour que le joueur 2 rejoigne (lien, code, QR code) |

### Flux cible (2 joueurs humains)

```
Joueur 1 (PC A)                    Backend Django              Joueur 2 (PC B)
     │                                  │                           │
     │ POST /api/game/new/              │                           │
     │ mode=vs_human                    │                           │
     │←── game_id: "abc123" ──────────│                           │
     │                                  │                           │
     │ (partage le game_id)             │                           │
     │────────────────────────────────→│                           │
     │                                  │  GET /api/game/abc123/state/?player=2
     │                                  │←──────────────────────────
     │                                  │──→ state (masqué pour P2) │
     │                                  │                           │
     │ POST /api/game/abc123/move/      │                           │
     │ sr=6,sc=0,tr=5,tc=0              │                           │
     │←── state (game_over=false) ────│                           │
     │                                  │  (polling) GET state     │
     │                                  │←──────────────────────────
     │                                  │──→ state (tour = P2) ───→│
     │                                  │                           │
     │ (polling) GET state              │  POST move               │
     │←── state (tour = P1) ──────────│←──────────────────────────
     │                                  │                           │
```

### Impact sur le frontend actuel

Le split-screen actuel (P1 à gauche, P2 à droite) est **utile en développement** pour voir les deux perspectives. En production, chaque client n'affiche qu'une grille — celle du joueur connecté.

---

## 2. Core Game Rules & Mechanics

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

## 3. AI Engine (ISMCTS — simplifié)

### Implémentation réelle vs spécification

| Fonctionnalité | Spécifié | Implémenté |
|---------------|----------|------------|
| Determinization (randomisation des pièces ennemies inconnues) | ✅ | ❌ Stub — `deepcopy` sans randomisation |
| Sélection UCT (Upper Confidence Bound for Trees) | ✅ | ❌ Pas d'arbre, pas d'UCT |
| Expansion / Rollout / Backpropagation | ✅ | ❌ Simple évaluation 1-coup |
| Heuristique d'évaluation | ✅ | ✅ Balance matérielle basique (`evaluate_board`) |
| Génération de moves légaux | ✅ | ✅ `get_legal_moves` avec scout multi-step |

### Algorithme actuel

```
choose_move(board, simulations=30):
  1. Génère les moves légaux
  2. Pour chaque simulation:
     a. Determinize (actuellement: copie sans randomisation)
     b. Pour chaque move légal:
        - Exécute le move sur une copie
        - Évalue le board résultant (balance matérielle)
        - Accumule le score
  3. Retourne le move avec le meilleur score cumulé
```

**Problèmes** :
- L'IA voit toutes les pièces adverses (determinize() ne masque rien)
- Pas d'exploration vs exploitation (pas d'UCT)
- Pas de recherche en profondeur (1 coup seulement)
- Le `try/except: pass` dans `choose_move` masque les erreurs silencieusement

---

## 4. API Endpoints

### Endpoints implémentés

| Méthode | Route | Description | Statut |
|---------|-------|-------------|--------|
| POST | `/api/game/new/` | Nouvelle partie avec placement auto | ✅ |
| GET | `/api/game/<id>/state/?player=N` | État visible pour le joueur N | ✅ |
| POST | `/api/game/<id>/move/` | Jouer un coup (P1) + contre-coup IA (P2) | ⚠️ Sans validation |

### Endpoint spécifié mais non implémenté

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/game/<id>/ai-move/` | Déclencher l'IA indépendamment |

Le move AI est actuellement intégré dans le endpoint `/move/` (exécuté automatiquement après le coup du joueur 1).

### Problèmes API

- **Aucune validation des coordonnées** : pas de range check, pas de vérification que la pièce appartient au joueur, pas de validation de légalité du mouvement.
- **Pas de CORS** : les requêtes cross-origin (frontend :5173 → backend :8000) seront bloquées.
- **Pas de serializers DRF** : utilisation directe d'`APIView` avec `request.data`.
- **Race condition** : pas de locking sur `ACTIVE_GAMES`, les requêtes concurrentes peuvent corrompre l'état.
- **`ai_move` exposé** dans la réponse → fuite d'information.

---

## 5. Frontend (Vue 3 + TypeScript)

### Implémenté
- Grille 10×10 interactive avec click-to-move
- Split-screen : perspective Joueur 1 (gauche) + perspective IA/Joueur 2 (droite)
- Fog of War visuel : pièces ennemies masquées (🛡️), pièces révélées affichées
- Sélection visuelle (anneau jaune) et feedback de statut
- Tailwind CSS via CDN pour le styling

### Limitations
- Composant **monolithique** : tout dans `App.vue` (166 lignes) — pas de composants réutilisables
- **Pas d'interfaces TypeScript** : utilisation de `any` partout
- **URLs hardcodées** : `http://localhost:8000` en dur (×4 occurrences)
- **Pas d'état de chargement** ni de gestion d'erreur HTTP (`res.ok` non vérifié)
- **Double appel API** à l'initialisation : fetch P1 puis fetch P2 séparément
- **Tailwind CDN** en production non idéal — devrait être intégré au build Vite

---

## 6. Configuration & Déploiement

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

### Fichiers manquants
- `.gitignore`
- `requirements.txt`
- Le projet n'est pas initialisé en repo git

---

## 7. Prochaines étapes (priorisées)

1. **Validation des moves** dans l'API (bloquant pour jouer)
2. **CORS** (`django-cors-headers`) pour permettre la communication frontend↔backend
3. **Determinize() ISMCTS** : randomiser les pièces ennemies inconnues
4. **Sécurisation Django** : `SECRET_KEY` en variable d'env, `DEBUG=False`, `ALLOWED_HOSTS`
5. **Configuration d'environnement** frontend (`.env` pour l'URL API)
6. **`.gitignore` + `requirements.txt` + `git init`**
7. **Découpage du frontend** en composants + interfaces TypeScript
8. **Persistence** : remplacer `ACTIVE_GAMES` dict par du stockage DB ou fichier
9. **ISMCTS complet** : UCT, arbre de recherche, rollouts
