import pytest
from game_engine.stratego_logic import StrategoBoard, create_army_pieces, BOARD_SIZE, IMMOBILE_PIECES
from game_engine.ismcts import HeuristicAI, get_legal_moves, execute_move


# ─── Army creation ────────────────────────────────────────────

def test_board_creation():
    board = StrategoBoard()
    assert board.grid[0][0]['player'] == 0
    assert not board.is_lake(0, 0)
    assert board.is_lake(4, 2)
    assert board.current_turn == 1
    assert board.game_over is False
    assert board.winner is None


def test_army_creation():
    pieces = create_army_pieces()
    assert len(pieces) == 40
    assert 'marshal' in pieces
    assert 'flag' in pieces
    assert pieces.count('bomb') == 6
    assert pieces.count('scout') == 8


# ─── Combat resolution ───────────────────────────────────────

class TestResolveCombat:
    def setup_method(self):
        self.board = StrategoBoard()

    def test_higher_rank_wins(self):
        result = self.board.resolve_combat(1, 'marshal', 2, 'general')
        assert result == 'attacker_win'

    def test_lower_rank_loses(self):
        result = self.board.resolve_combat(1, 'sergeant', 2, 'colonel')
        assert result == 'defender_win'

    def test_equal_rank_both_destroy(self):
        result = self.board.resolve_combat(1, 'captain', 2, 'captain')
        assert result == 'both_destroy'

    def test_spy_kills_marshal(self):
        result = self.board.resolve_combat(1, 'spy', 2, 'marshal')
        assert result == 'attacker_win'

    def test_spy_loses_to_others(self):
        result = self.board.resolve_combat(1, 'spy', 2, 'sergeant')
        assert result == 'defender_win'

    def test_miner_disarms_bomb(self):
        result = self.board.resolve_combat(1, 'miner', 2, 'bomb')
        assert result == 'attacker_win'

    def test_non_miner_dies_to_bomb(self):
        result = self.board.resolve_combat(1, 'marshal', 2, 'bomb')
        assert result == 'defender_win'

    def test_flag_capture_wins_game(self):
        result = self.board.resolve_combat(1, 'scout', 2, 'flag')
        assert result == 'attacker_win_game'


# ─── Move validation ─────────────────────────────────────────

class TestLegalMoves:
    def test_mobile_piece_has_moves(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
        moves = get_legal_moves(board, 1)
        assert len(moves) > 0

    def test_flag_cannot_move(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'flag', 'revealed': False}
        moves = get_legal_moves(board, 1)
        assert len(moves) == 0

    def test_bomb_cannot_move(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'bomb', 'revealed': False}
        moves = get_legal_moves(board, 1)
        assert len(moves) == 0

    def test_cannot_move_onto_own_piece(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
        board.grid[5][1] = {'player': 1, 'piece': 'captain', 'revealed': False}
        moves = get_legal_moves(board, 1)
        # (5,0) should not be able to move to (5,1) — own piece
        assert ((5, 0), (5, 1)) not in moves

    def test_cannot_move_onto_lake(self):
        board = StrategoBoard()
        # Place piece adjacent to lake at (4,2)
        board.grid[3][2] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
        moves = get_legal_moves(board, 1)
        assert ((3, 2), (4, 2)) not in moves

    def test_scout_moves_multiple_squares(self):
        board = StrategoBoard()
        board.grid[0][0] = {'player': 1, 'piece': 'scout', 'revealed': False}
        moves = get_legal_moves(board, 1)
        # Scout should be able to reach far cells in straight lines
        assert ((0, 0), (0, 1)) in moves
        assert ((0, 0), (0, 5)) in moves
        assert ((0, 0), (3, 0)) in moves

    def test_scout_blocked_by_lake(self):
        board = StrategoBoard()
        board.grid[4][1] = {'player': 1, 'piece': 'scout', 'revealed': False}
        moves = get_legal_moves(board, 1)
        # Scout at (4,1) moving right: (4,2) is a lake, so can't go there or beyond
        assert ((4, 1), (4, 2)) not in moves
        assert ((4, 1), (4, 3)) not in moves


# ─── Execute move ────────────────────────────────────────────

class TestExecuteMove:
    def test_simple_move(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
        execute_move(board, ((5, 0), (5, 1)))
        assert board.grid[5][1]['player'] == 1
        assert board.grid[5][1]['piece'] == 'sergeant'
        assert board.grid[5][0]['player'] == 0

    def test_combat_attacker_wins(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'marshal', 'revealed': False}
        board.grid[5][1] = {'player': 2, 'piece': 'sergeant', 'revealed': False}
        execute_move(board, ((5, 0), (5, 1)))
        assert board.grid[5][1]['player'] == 1
        assert board.grid[5][1]['piece'] == 'marshal'
        assert board.grid[5][0]['player'] == 0

    def test_combat_defender_wins(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'scout', 'revealed': False}
        board.grid[5][1] = {'player': 2, 'piece': 'marshal', 'revealed': False}
        execute_move(board, ((5, 0), (5, 1)))
        assert board.grid[5][1]['player'] == 2
        assert board.grid[5][0]['player'] == 0

    def test_combat_both_destroy(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'captain', 'revealed': False}
        board.grid[5][1] = {'player': 2, 'piece': 'captain', 'revealed': False}
        execute_move(board, ((5, 0), (5, 1)))
        assert board.grid[5][0]['player'] == 0
        assert board.grid[5][1]['player'] == 0


# ─── Game over conditions ────────────────────────────────────

class TestGameOver:
    def test_flag_capture_ends_game(self):
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'scout', 'revealed': False}
        board.grid[5][1] = {'player': 2, 'piece': 'flag', 'revealed': False}
        execute_move(board, ((5, 0), (5, 1)))
        assert board.game_over is True
        assert board.winner == 1

    def test_immobilization_victory(self):
        """A player with no mobile pieces left should lose."""
        board = StrategoBoard()
        # Player 2 has only bombs and a flag — no mobile pieces
        board.grid[0][0] = {'player': 2, 'piece': 'flag', 'revealed': False}
        board.grid[0][1] = {'player': 2, 'piece': 'bomb', 'revealed': False}
        # Player 1 has a mobile piece
        board.grid[5][0] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
        board.grid[5][1] = {'player': 1, 'piece': 'flag', 'revealed': False}

        # Check immobilization explicitly
        board.check_immobilization_victory()
        assert board.game_over is True
        assert board.winner == 1  # Player 2 has no mobile pieces, Player 1 wins

    def test_immobilization_via_execute_move(self):
        """Capturing the last mobile enemy piece should trigger immobilization win."""
        board = StrategoBoard()
        board.grid[5][0] = {'player': 1, 'piece': 'marshal', 'revealed': False}
        # Player 2's only mobile piece
        board.grid[5][1] = {'player': 2, 'piece': 'scout', 'revealed': False}
        # Player 2 still has flag and bomb but no mobile pieces after this
        board.grid[0][0] = {'player': 2, 'piece': 'flag', 'revealed': False}
        board.grid[0][1] = {'player': 2, 'piece': 'bomb', 'revealed': False}
        # Player 1 has a flag too
        board.grid[9][0] = {'player': 1, 'piece': 'flag', 'revealed': False}

        execute_move(board, ((5, 0), (5, 1)))
        # Flag not captured, but player 2 has no mobile pieces
        assert board.game_over is True
        assert board.winner == 1


# ─── AI basic tests ──────────────────────────────────────────

class TestHeuristicAI:
    def test_ai_can_choose_move(self):
        board = StrategoBoard()
        board.grid[6][0] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
        board.grid[3][0] = {'player': 2, 'piece': 'sergeant', 'revealed': False}
        ai = HeuristicAI(ai_player=2)
        move = ai.choose_move(board, simulations=5)
        assert move is not None

    def test_ai_returns_none_when_no_moves(self):
        board = StrategoBoard()
        # Player 2 has only immobile pieces
        board.grid[0][0] = {'player': 2, 'piece': 'bomb', 'revealed': False}
        ai = HeuristicAI(ai_player=2)
        move = ai.choose_move(board, simulations=5)
        assert move is None


# ─── API view tests ──────────────────────────────────────────

class TestAPIViews:
    """Test the API views using Django REST Framework's test client."""

    @pytest.fixture(autouse=True)
    def setup_client(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        # Clear any existing games
        from game_engine.views import ACTIVE_GAMES
        ACTIVE_GAMES.clear()

    def _create_game(self):
        response = self.client.post('/api/game/new/')
        assert response.status_code == 200
        return response.data

    def test_new_game_returns_token(self):
        data = self._create_game()
        assert 'game_id' in data
        assert 'player_token' in data
        assert data['current_turn'] == 1

    def test_state_requires_token(self):
        data = self._create_game()
        # Without token → 401
        response = self.client.get(f'/api/game/{data["game_id"]}/state/')
        assert response.status_code == 401

    def test_state_rejects_bad_token(self):
        data = self._create_game()
        response = self.client.get(f'/api/game/{data["game_id"]}/state/?player_token=wrong')
        assert response.status_code == 403

    def test_state_accepts_valid_token(self):
        data = self._create_game()
        response = self.client.get(
            f'/api/game/{data["game_id"]}/state/?player_token={data["player_token"]}'
        )
        assert response.status_code == 200
        assert 'grid' in response.data

    def test_move_requires_token(self):
        data = self._create_game()
        response = self.client.post(f'/api/game/{data["game_id"]}/move/', {
            'sr': 6, 'sc': 0, 'tr': 5, 'tc': 0,
        })
        assert response.status_code == 401

    def test_move_rejects_invalid_coords(self):
        data = self._create_game()
        response = self.client.post(f'/api/game/{data["game_id"]}/move/', {
            'sr': 'abc', 'sc': 0, 'tr': 5, 'tc': 0,
            'player_token': data['player_token'],
        })
        assert response.status_code == 400

    def test_game_capacity_limit(self):
        from game_engine.views import MAX_ACTIVE_GAMES, ACTIVE_GAMES
        # Fill to capacity
        for _ in range(MAX_ACTIVE_GAMES):
            self._create_game()
        assert len(ACTIVE_GAMES) == MAX_ACTIVE_GAMES
        # Next game should fail
        response = self.client.post('/api/game/new/')
        assert response.status_code == 503
