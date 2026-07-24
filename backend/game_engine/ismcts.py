import random
import copy
from .stratego_logic import StrategoBoard, BOARD_SIZE, LAKES, PIECES_CONFIG, create_army_pieces

class ISMCTSAI:
    def __init__(self, ai_player=2):
        self.ai_player = ai_player
        self.opponent_player = 1 if ai_player == 2 else 2

    def get_legal_moves(self, board, player):
        moves = []
        # Find all pieces of player
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                cell = board.grid[r][c]
                if cell['player'] == player and cell['piece'] not in ('flag', 'bomb', 'unknown', None):
                    # Check 4 directions
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        # Scouts can move multiple steps in straight lines
                        if cell['piece'] == 'scout':
                            step = 1
                            while True:
                                tr, tc = r + dr * step, c + dc * step
                                if not board.is_valid_coord(tr, tc) or board.is_lake(tr, tc):
                                    break
                                t_cell = board.grid[tr][tc]
                                if t_cell['player'] == player:
                                    break
                                moves.append(((r, c), (tr, tc)))
                                if t_cell['player'] != 0:  # Hit an enemy or obstacle
                                    break
                                step += 1
                        else:
                            if board.is_valid_coord(nr, nc) and not board.is_lake(nr, nc):
                                t_cell = board.grid[nr][nc]
                                if t_cell['player'] != player:
                                    moves.append(((r, c), (nr, nc)))
        return moves

    def execute_move(self, board, move):
        (sr, sc), (tr, tc) = move
        attacker = board.grid[sr][sc]
        defender = board.grid[tr][tc]

        if defender['player'] == 0:
            board.grid[tr][tc] = dict(attacker)
            board.grid[sr][sc] = {'player': 0, 'piece': None, 'revealed': False}
        else:
            result = board.resolve_combat(attacker['player'], attacker['piece'],
                                          defender['player'], defender['piece'])
            defender['revealed'] = True
            attacker['revealed'] = True

            if result == 'attacker_win_game':
                board.game_over = True
                board.winner = attacker['player']
                board.grid[tr][tc] = dict(attacker)
                board.grid[sr][sc] = {'player': 0, 'piece': None, 'revealed': False}
            elif result == 'attacker_win':
                board.grid[tr][tc] = dict(attacker)
                board.grid[sr][sc] = {'player': 0, 'piece': None, 'revealed': False}
            elif result == 'defender_win':
                board.grid[sr][sc] = {'player': 0, 'piece': None, 'revealed': False}
            elif result == 'both_destroy':
                board.grid[tr][tc] = {'player': 0, 'piece': None, 'revealed': False}
                board.grid[sr][sc] = {'player': 0, 'piece': None, 'revealed': False}

    def choose_move(self, real_board, simulations=30):
        legal_moves = self.get_legal_moves(real_board, self.ai_player)
        if not legal_moves:
            return None

        move_scores = {move: 0 for move in legal_moves}

        for _ in range(simulations):
            # 1. Determinization: create a plausible full board state
            #    by randomizing unrevealed enemy pieces
            sim_board = self.determinize(real_board, self.ai_player)

            # 2. Evaluate each legal move on this determinization
            for move in legal_moves:
                test_board = copy.deepcopy(sim_board)
                try:
                    self.execute_move(test_board, move)
                    # Heuristic score: material balance
                    score = self.evaluate_board(test_board, self.ai_player)
                    move_scores[move] += score
                except Exception:
                    pass

        # Return best move
        if not move_scores:
            return None
        best_move = max(legal_moves, key=lambda m: move_scores.get(m, 0))
        return best_move

    def determinize(self, real_board, ai_player):
        """Creates a copy where unrevealed enemy pieces are randomly shuffled.

        From the AI's perspective, it knows which enemy pieces exist (piece counts)
        but NOT their positions on the board. This simulates that uncertainty by
        collecting all enemy pieces and randomly reassigning them to enemy positions.
        """
        sim_board = copy.deepcopy(real_board)
        opponent = self.opponent_player

        # Collect all enemy piece positions and their pieces
        enemy_positions = []
        enemy_pieces = []

        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                cell = sim_board.grid[r][c]
                if cell['player'] == opponent and cell['piece'] is not None:
                    enemy_positions.append((r, c))
                    enemy_pieces.append(cell['piece'])

        # Shuffle the pieces and reassign them to the same positions
        if enemy_positions:
            random.shuffle(enemy_pieces)
            for i, (r, c) in enumerate(enemy_positions):
                sim_board.grid[r][c]['piece'] = enemy_pieces[i]

        return sim_board

    def evaluate_board(self, board, player):
        score = 0
        rank_values = {10: 100, 9: 80, 8: 60, 7: 40, 6: 30, 5: 25,
                       4: 20, 3: 15, 2: 10, 1: 50, 0: 1000, -1: 10}
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                cell = board.grid[r][c]
                if cell['piece'] is None:
                    continue
                rank = board.get_rank(cell['piece'])
                if cell['player'] == player:
                    score += rank_values.get(rank, 10)
                elif cell['player'] != 0:
                    score -= rank_values.get(rank, 10)
        return score
