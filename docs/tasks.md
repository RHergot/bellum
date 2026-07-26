# Task Breakdown: Bellum — Placement Manuel

## Phase 0 : Préparation & Tests (backend)

- [ ] **T0.1** — Écrire les tests unitaires de validation de placement dans `backend/game_engine/tests.py`
  - `test_validate_manual_placement_valide` : placement correct (40 pièces, bonnes rangées, bonnes quantités)
  - `test_validate_placement_mauvais_nombre_pieces` : 39 ou 41 pièces → rejeté
  - `test_validate_placement_hors_zone` : pièce hors rangées 6-9 → rejeté
  - `test_validate_placement_doublon_coords` : deux pièces même case → rejeté
  - `test_validate_placement_quantites` : 2 Marshals au lieu d'1 → rejeté
  - `test_validate_placement_piece_invalide` : clé inconnue → rejeté
  - `test_validate_placement_lac` : pièce sur un lac → rejeté
  - **Vérification** : `cd backend && .venv/bin/python -m pytest game_engine/tests.py -v` → 8 tests FAIL (fonction pas encore codée)

- [ ] **T0.2** — Implémenter `_validate_manual_placement(placement, player)` dans `backend/game_engine/stratego_logic.py`
  - Validation : 40 pièces, coordonnées dans [0,9], zone joueur (6-9 P1 / 0-3 P2), pas de lac, pas de doublons, clés valides, quantités exactes
  - **Vérification** : `cd backend && .venv/bin/python -m pytest game_engine/tests.py -v` → 8 tests PASS

## Phase 1 : Backend — Endpoint de création modifié

- [ ] **T1.1** — Modifier `NewGameAPIView.post()` dans `backend/game_engine/views.py`
  - Lire `placement_mode` dans `request.data` (défaut: `'random'`)
  - Si `'random'` → comportement inchangé (auto-placement actuel)
  - Si `'manual'` → lire `manual_placement`, appeler `_validate_manual_placement()`, placer les pièces sur la grille
  - Retourner une erreur 400 si validation échoue
  - **Vérification** : `curl -X POST http://localhost:8000/api/game/new/ -H 'Content-Type: application/json' -d '{"placement_mode":"manual","manual_placement":[...]}'` → 200 avec game_id OU 400 avec message d'erreur

- [ ] **T1.2** — Ajouter les tests d'intégration API dans `backend/game_engine/tests.py`
  - `test_api_new_game_random` : POST avec `placement_mode: 'random'` → 200, grille remplie
  - `test_api_new_game_manual_valid` : POST avec placement valide → 200, grille correspond au placement
  - `test_api_new_game_manual_invalid` : POST avec placement invalide → 400 avec message
  - `test_api_new_game_default_random` : POST sans `placement_mode` → 200 (défaut random)
  - **Vérification** : `cd backend && .venv/bin/python -m pytest game_engine/tests.py -v -k "test_api_new_game"` → 4 tests PASS

## Phase 2 : Frontend — Types & State

- [ ] **T2.1** — Ajouter les types dans `frontend/src/types/game.ts`
  - `PlacementMode = 'random' | 'manual'`
  - `PieceCount = { key, name, rank, emoji, remaining }`
  - `GridPiece = { r, c, piece }`
  - `InHandPiece = { key, source: 'pool' | { r, c } }`
  - `PlacementState = { mode, piecesInPool, piecesOnGrid, inHand }`
  - **Vérification** : `cd frontend && npx tsc --noEmit` → pas d'erreurs

- [ ] **T2.2** — Créer `frontend/src/composables/usePlacement.ts`
  - `buildInitialPool()` : génère les 40 pièces avec leurs compteurs
  - `pickFromPool(key)` : palette → `inHand`, décrémente `remaining`
  - `pickFromGrid(r, c)` : grille → `inHand`, la case se vide
  - `placeOnCell(r, c)` : pose/déplace/échange selon `inHand.source` et occupation de la case
  - `returnToPool(r, c)` : clic droit → retour au pool
  - `returnToGridSource()` : annulation → `inHand` retourne à sa case d'origine
  - `clearAll()` : vide toute la grille → pool
  - Computed : `placedCount`, `canConfirm`
  - **Vérification** : `cd frontend && npx tsc --noEmit` → pas d'erreurs

- [ ] **T2.3** — Intégrer dans `useGame.ts`
  - `startPlacement()` → appelle `buildInitialPool()`, passe en phase `'placement'`
  - `confirmPlacement()` → POST `/api/game/new/` avec `placement_mode: 'manual'` + `manual_placement`
  - `cancelPlacement()` → reset
  - **Vérification** : logique fonctionnelle, tests manuels dans la console

## Phase 3 : Frontend — Composants UI

- [ ] **T3.1** — Créer `PlacementModeSelector.vue`
  - Deux boutons : « 🎲 Aléatoire » et « 🧩 Manuel »
  - Style cohérent avec le thème dark existant
  - Émet `@select` avec le mode choisi
  - **Vérification** : composant affiché, clic fonctionnel

- [ ] **T3.2** — Créer `PiecePalette.vue`
  - Affiche les pièces du pool, groupées par type (Marshal ×1, General ×1, etc.)
  - Chaque entrée montre : emoji, nom, compteur `remaining`
  - Clic sur une entrée → `pickFromPool(key)` (la pièce passe « en main »)
  - Désactivé visuellement si `remaining === 0`
  - La pièce actuellement `inHand` est surlignée
  - Props : `pool: PieceCount[]`, `inHand: InHandPiece | null`
  - Emits : `@pick(key)`
  - **Vérification** : clic sélectionne, compteur décrémente

- [ ] **T3.3** — Créer `PlacementGrid.vue`
  - Canvas 10×10 avec zone de déploiement (rangées 6-9) en surbrillance verte
  - Pièces déjà sur la grille : affichées avec leur emoji
  - Si `inHand` n'est pas null :
    - Cases vides de la zone : curseur pointer, prêtes à recevoir
    - Case survolée : « fantôme » de la pièce en transparence
  - Clic gauche case vide → `placeOnCell(r, c)`
  - Clic gauche case occupée (sa propre pièce) → `pickFromGrid(r, c)` (la prend en main)
  - Clic droit case occupée → `returnToPool(r, c)` (retour direct au pool)
  - Compteur « 12/40 pièces placées » en bas
  - Bouton « Vider » pour tout remettre dans le pool
  - Props : `grid: GridPiece[]`, `inHand`, `placedCount`
  - Emits : `@pick(r,c)`, `@place(r,c)`, `@return(r,c)`, `@clear`
  - **Vérification** : rendu correct, tous les gestes fonctionnels

- [ ] **T3.4** — Intégrer dans `App.vue`
  - Si `gameState.phase === 'placement'` et mode pas encore choisi → `PlacementModeSelector`
  - Si `gameState.phase === 'placement'` et mode 'manual' → `PlacementGrid + PiecePalette` côte à côte
  - Si mode 'random' → `startNewGame()` directement (comportement actuel)
  - Barre d'actions en bas : compteur + « Vider » + « ✅ Confirmer » (actif si `canConfirm`) + « Annuler »
  - Si `gameState.phase === 'battle'` → affichage normal (existant)
  - **Vérification** : `cd frontend && npx vite --host 0.0.0.0` → navigation complète fonctionnelle

## Phase 4 : Intégration & Tests End-to-End

- [ ] **T4.1** — Tester le flux complet manuellement
  - Lancer backend : `cd backend && .venv/bin/python manage.py runserver 0.0.0.0:8000`
  - Lancer frontend : `cd frontend && npx vite --host 0.0.0.0`
  - Scénario 1 : Placement aléatoire → partie jouable (régression)
  - Scénario 2 : Placement manuel → placer 40 pièces → confirmer → partie jouable
  - Scénario 3 : Placement manuel invalide (39 pièces) → message d'erreur
  - **Vérification** : les 3 scénarios passent

- [ ] **T4.2** — Déployer sur le LXC Bellum
  - `git add`, `git commit`, `git push`
  - `ssh richie@100.87.165.43 "incus exec bellum -- bash -c 'cd /opt/Projets/bellum && git pull && pm2 restart all'"`
  - Tester sur `https://bellum.rhesoftware.com`
  - **Vérification** : fonctionnel en production

---

## Résumé des priorités

| Priorité | Tâche | |
|----------|-------|-------|
| 🔴 P0 | T0.1-T0.2 Tests + validation backend | Fondation |
| 🔴 P0 | T1.1-T1.2 Endpoint modifié + tests intégration | API |
| 🔴 P0 | T2.1-T2.2 Types + logique placement | Frontend core |
| 🔴 P0 | T3.1-T3.4 Composants UI | Interface |
| 🟡 P1 | T4.1 Tests manuels | Validation |
| 🟡 P1 | T4.2 Déploiement LXC | Production |
