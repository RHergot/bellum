import random
import copy
from .stratego_logic import StrategoBoard, BOARD_SIZE, LAKES, PIECES_CONFIG, IMMOBILE_PIECES


def get_legal_moves(board, player):
    """Return a list of legal moves for the given player on the board.

    Each move is a tuple ((sr, sc), (tr, tc)).
    This is a standalone function usable without instantiating an AI.
    """
    moves = []
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            cell = board.grid[r][c]
            if cell['player'] == player and cell['piece'] not in (*IMMOBILE_PIECES, 'unknown', None):
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


def execute_move(board, move):
    """Execute a move on the board, resolving combat if necessary.

    This is a standalone function usable without instantiating an AI.
    After calling this, check board.game_over and board.check_immobilization_victory().
    """
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

    # Check immobilization victory after every move
    if not board.game_over:
        board.check_immobilization_victory()


class HeuristicAI:
    """AI player using heuristic sampling with random determinization.

    This is NOT a true ISMCTS (no search tree, no UCB1, no rollouts).
    It evaluates each legal move across multiple randomized board states
    (determinizations) and picks the best-scoring move.
    """

    def __init__(self, ai_player=2):
        self.ai_player = ai_player
        self.opponent_player = 1 if ai_player == 2 else 2
        self._last_positions = {}  # piece coordinate → previous position, avoid ping-pong

    def choose_move(self, real_board, simulations=50):
        legal_moves = get_legal_moves(real_board, self.ai_player)
        if not legal_moves:
            return None

        move_scores = {move: 0.0 for move in legal_moves}

        for _ in range(simulations):
            sim_board = self._determinize(real_board)

            for move in legal_moves:
                test_board = copy.deepcopy(sim_board)
                try:
                    execute_move(test_board, move)
                    score = self._evaluate_board(test_board, self.ai_player)
                    move_scores[move] += score
                except Exception:
                    pass

        # Anti-ping-pong: penalize moves that return to the previous position
        for move in legal_moves:
            (sr, sc), (tr, tc) = move
            # If this destination was the previous source (ping-pong), penalize
            prev_src = self._last_positions.get((tr, tc))
            if prev_src == (sr, sc):
                move_scores[move] -= 500  # heavy penalty for going back
            # Add small random jitter to break ties (prevents deterministic loops)
            move_scores[move] += random.uniform(-10, 10)

        # Pick best move
        best_move = max(legal_moves, key=lambda m: move_scores.get(m, 0))

        # Remember this move to detect ping-pong next turn
        (bsr, bsc), (btr, btc) = best_move
        self._last_positions[(bsr, bsc)] = (btr, btc)

        return best_move

    def _determinize(self, real_board):
        """Creates a copy where only UNREVEALED enemy pieces are randomly shuffled.

        Revealed enemy pieces (identified through past combat) keep their
        known positions. Only hidden pieces are redistributed randomly among
        the remaining hidden enemy positions.
        """
        sim_board = copy.deepcopy(real_board)
        opponent = self.opponent_player

        # Collect only unrevealed enemy piece positions and their pieces
        unrevealed_positions = []
        unrevealed_pieces = []

        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                cell = sim_board.grid[r][c]
                if cell['player'] == opponent and cell['piece'] is not None:
                    if not cell['revealed']:
                        unrevealed_positions.append((r, c))
                        unrevealed_pieces.append(cell['piece'])
                    # Revealed pieces stay in place — the AI remembers them

        # Shuffle only the unrevealed pieces and reassign
        if unrevealed_positions:
            random.shuffle(unrevealed_pieces)
            for i, (r, c) in enumerate(unrevealed_positions):
                sim_board.grid[r][c]['piece'] = unrevealed_pieces[i]

        return sim_board

    def _evaluate_board(self, board, player):
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


# Backward-compatible alias
ISMCTSAI = HeuristicAI
