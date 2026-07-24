# Task Breakdown: Bellum

## Phase 1: Project Scaffolding & Environment Setup

- [x] Initialize Django project (`backend/`) and app (`game_engine/`)
- [x] Configure SQLite and Django REST Framework
- [x] Scaffold Vue 3 + TypeScript + Vite frontend project (`frontend/`)
- [x] Create PM2 `ecosystem.config.cjs` for dual-server management
- [ ] ~~Configure PostgreSQL~~ → SQLite conservé pour simplicité

## Phase 2: Domain Model & Game Rules

- [x] Implement `StrategoBoard` grid (10×10), lakes, and coordinate validation
- [x] Define piece config (`PIECES_CONFIG`), ranks, and combat resolution matrix
- [x] Implement Fog-of-War state filtering (`to_dict(for_player=N)` masks enemy pieces)
- [x] Auto-placement of armies (rows 0-3 for P2, rows 6-9 for P1)
- [x] Write unit tests for board creation, army creation, and AI legal moves
- [ ] Add test for combat resolution (spy vs marshal, miner vs bomb, equal ranks)
- [ ] Add test for `to_dict()` fog-of-war filtering

## Phase 3: ISMCTS AI Engine

- [ ] Implement determinization: randomize unknown enemy pieces respecting piece counts
- [ ] Implement UCT selection logic (exploration vs exploitation)
- [ ] Implement proper MCTS tree: selection → expansion → simulation → backpropagation
- [x] Add basic heuristic evaluation (material balance via `evaluate_board`)
- [x] Generate legal moves for AI (`get_legal_moves` with scout multi-step)
- [x] Integrate AI move execution into the API (`choose_move` + `execute_move`)

**État actuel** : L'algorithme est un simple évaluateur 1-coup répété N fois sur le même board (pas de vrai ISMCTS).  
`determinize()` est un stub (`copy.deepcopy` sans randomisation).  
Pas d'arbre de recherche, pas d'UCT.

## Phase 4: DRF API Endpoints

- [ ] Create Serializers for game state, board cells, and move payloads
- [x] Implement game creation endpoint (`POST /api/game/new/`)
- [x] Implement state retrieval endpoint (`GET /api/game/<id>/state/`)
- [x] Implement move endpoint (`POST /api/game/<id>/move/` — move P1 + contre-coup IA)
- [ ] Implement independent AI-move endpoint (`POST /api/game/<id>/ai-move/`)
- [ ] **Validate moves** : range check, ownership, legality, adjacency
- [ ] **Add CORS** : install and configure `django-cors-headers`
- [ ] Add input validation on coordinates (reject out-of-range)
- [ ] Test API endpoints via pytest

## Phase 5: Frontend Interface (Vue 3 + TS)

- [x] Build responsive 10×10 grid with click-to-move
- [x] Split-screen dual perspective (P1 left, AI/P2 right)
- [x] Fog-of-War visual styling (🛡️ for hidden, 3-letter label for revealed)
- [x] Connect frontend to Django REST API via `fetch`
- [ ] Extract reusable components (`GameBoard.vue`, `CellGrid.vue`, `StatusBar.vue`)
- [ ] Define TypeScript interfaces (`Cell`, `GridState`, `Move`, `GameState`)
- [ ] Add loading states and proper HTTP error handling (`res.ok`)
- [ ] Move API URL to environment config (`.env` / Vite env vars)
- [ ] Replace Tailwind CDN with proper Vite/Tailwind build integration
- [ ] Optimize: avoid double API call at game start

## Phase 6: Integration, Polish & Deployment

- [x] Basic game loop (P1 move → AI counter-move → win/loss check)
- [ ] Verify full game loop with move validation
- [x] PM2 ecosystem config (back + front)
- [ ] Replace `runserver` with `gunicorn` for production
- [ ] Replace Vite dev server with static build + nginx/Caddy
- [ ] Security: `SECRET_KEY` → env var, `DEBUG=False`, `ALLOWED_HOSTS` config
- [ ] Add `.gitignore` and `requirements.txt`
- [ ] Initialize git repo
- [ ] Write deployment documentation
- [ ] Replace in-memory `ACTIVE_GAMES` with DB persistence

---

## Résumé des priorités

| Priorité | Tâche | Bloquant ? |
|----------|-------|-----------|
| 🔴 P0 | Validation des moves dans l'API | Oui — le jeu est injouable |
| 🔴 P0 | CORS (`django-cors-headers`) | Oui — frontend bloqué |
| 🔴 P0 | `determinize()` ISMCTS (randomisation) | Oui — l'IA triche |
| 🟡 P1 | Sécurisation Django (SECRET_KEY, DEBUG, ALLOWED_HOSTS) | Non |
| 🟡 P1 | `.gitignore` + `requirements.txt` + `git init` | Non |
| 🟡 P1 | Configuration d'environnement frontend | Non |
| 🟢 P2 | Découpage composants Vue + interfaces TS | Non |
| 🟢 P2 | Persistence DB | Non |
| 🟢 P2 | ISMCTS complet (UCT, arbre, rollouts) | Non |
| 🟢 P3 | Productionisation (gunicorn, build statique) | Non |
