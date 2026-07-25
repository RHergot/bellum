from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import uuid
import os
from datetime import datetime, timedelta
from .stratego_logic import StrategoBoard, create_army_pieces, BOARD_SIZE, LAKES
from .ismcts import HeuristicAI, get_legal_moves, execute_move

# ──────────────────────────────────────────────
# In-memory active games store
# ──────────────────────────────────────────────
MAX_ACTIVE_GAMES = 100
GAME_TTL_HOURS = 2

# Each entry: {'board': StrategoBoard, 'ai': HeuristicAI, 'token': str, 'created_at': datetime}
ACTIVE_GAMES = {}

LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'docs', 'game-log.md')
LOG_MAX_BYTES = 1_000_000  # 1 MB


def _purge_old_games():
    """Remove games older than GAME_TTL_HOURS to prevent memory leaks."""
    cutoff = datetime.now() - timedelta(hours=GAME_TTL_HOURS)
    expired = [gid for gid, g in ACTIVE_GAMES.items() if g['created_at'] < cutoff]
    for gid in expired:
        del ACTIVE_GAMES[gid]


def _log_move(game_id, player, piece, sr, sc, tr, tc, result='move'):
    """Append a move to the game log file (truncated at LOG_MAX_BYTES)."""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        # Truncate if too large
        if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > LOG_MAX_BYTES:
            with open(LOG_FILE, 'w') as f:
                f.write('| timestamp | game | player | piece | move | result |\n')
                f.write('|---|---|---|---|---|---|\n')
        with open(LOG_FILE, 'a') as f:
            f.write(f'| {ts} | {game_id} | P{player} | {piece} | ({sr},{sc})→({tr},{tc}) | {result} |\n')
    except Exception:
        pass  # non-critical


def _validate_move(board, player, sr, sc, tr, tc):
    """Validate a move. Returns (is_valid, error_message)."""
    # Range check
    if not (0 <= sr < BOARD_SIZE and 0 <= sc < BOARD_SIZE and
            0 <= tr < BOARD_SIZE and 0 <= tc < BOARD_SIZE):
        return False, 'Coordinates out of range (0-9)'

    # Lake check
    if (tr, tc) in LAKES:
        return False, 'Cannot move onto a lake'

    # Source must belong to the player
    src_cell = board.grid[sr][sc]
    if src_cell['player'] != player:
        return False, f'Source cell does not belong to player {player}'

    # Source piece must be mobile
    if src_cell['piece'] in ('flag', 'bomb'):
        return False, f'{src_cell["piece"].capitalize()} cannot move'

    # Destination must not be occupied by own piece
    dst_cell = board.grid[tr][tc]
    if dst_cell['player'] == player:
        return False, 'Cannot move onto your own piece'

    # Validate using standalone legal moves (covers adjacency, scout range, etc.)
    legal = get_legal_moves(board, player)
    if ((sr, sc), (tr, tc)) not in legal:
        return False, 'Illegal move (not adjacent or blocked)'

    return True, None


def _authenticate_player(request, game_entry):
    """Validate the player_token from the request. Returns (player_num, error_response)."""
    token = request.data.get('player_token') or request.GET.get('player_token')
    if not token:
        return None, Response({'error': 'Missing player_token'}, status=status.HTTP_401_UNAUTHORIZED)
    if token != game_entry['token']:
        return None, Response({'error': 'Invalid player_token'}, status=status.HTTP_403_FORBIDDEN)
    return 1, None  # Player 1 is always the human


class NewGameAPIView(APIView):
    def post(self, request):
        # Purge expired games before checking capacity
        _purge_old_games()

        if len(ACTIVE_GAMES) >= MAX_ACTIVE_GAMES:
            return Response(
                {'error': f'Server full ({MAX_ACTIVE_GAMES} active games). Try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        game_id = str(uuid.uuid4())[:8]
        player_token = str(uuid.uuid4())
        board = StrategoBoard()

        # Auto-place Player 1 (Bottom 4 rows: rows 6 to 9)
        p1_pieces = create_army_pieces()
        idx = 0
        for r in range(6, BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if idx < len(p1_pieces):
                    board.grid[r][c] = {'player': 1, 'piece': p1_pieces[idx], 'revealed': False}
                    idx += 1

        # Auto-place AI Player 2 (Top 4 rows: rows 0 to 3)
        p2_pieces = create_army_pieces()
        idx = 0
        for r in range(0, 4):
            for c in range(BOARD_SIZE):
                if idx < len(p2_pieces):
                    board.grid[r][c] = {'player': 2, 'piece': p2_pieces[idx], 'revealed': False}
                    idx += 1

        board.current_turn = 1  # Player 1 starts

        # Create persistent AI instance to preserve anti-ping-pong state across requests
        ai = HeuristicAI(ai_player=2)

        ACTIVE_GAMES[game_id] = {
            'board': board,
            'ai': ai,
            'token': player_token,
            'created_at': datetime.now(),
        }

        return Response({
            'game_id': game_id,
            'player_token': player_token,
            'message': 'New Bellum game started successfully',
            'current_turn': 1,
            'state': board.to_dict(for_player=1)
        })


class GameStateAPIView(APIView):
    def get(self, request, game_id):
        if game_id not in ACTIVE_GAMES:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        game_entry = ACTIVE_GAMES[game_id]

        # Authenticate — only the owner can view the game state
        player, err = _authenticate_player(request, game_entry)
        if err:
            return err

        board = game_entry['board']
        return Response({
            **board.to_dict(for_player=player),
            'current_turn': board.current_turn
        })


class MakeMoveAPIView(APIView):
    def post(self, request, game_id):
        if game_id not in ACTIVE_GAMES:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)

        game_entry = ACTIVE_GAMES[game_id]

        # Authenticate
        player, err = _authenticate_player(request, game_entry)
        if err:
            return err

        board = game_entry['board']
        ai = game_entry['ai']
        data = request.data

        # Validate and convert coordinates to int
        try:
            sr = int(data['sr'])
            sc = int(data['sc'])
            tr = int(data['tr'])
            tc = int(data['tc'])
        except (KeyError, TypeError, ValueError):
            return Response({'error': 'Invalid move coordinates (must be integers)'},
                            status=status.HTTP_400_BAD_REQUEST)

        if board.game_over:
            return Response({'error': 'Game is over'}, status=status.HTTP_400_BAD_REQUEST)

        if board.current_turn != player:
            return Response({'error': f'Not your turn (current turn: player {board.current_turn})'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate move
        is_valid, error_msg = _validate_move(board, player, sr, sc, tr, tc)
        if not is_valid:
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # Execute Player move
        src_piece_key = board.grid[sr][sc]['piece']  # log before move (piece may be destroyed)
        try:
            execute_move(board, ((sr, sc), (tr, tc)))
            _log_move(game_id, player, src_piece_key or '?', sr, sc, tr, tc, 'move')
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Check if player just won
        if board.game_over:
            return Response({
                'status': 'game_over',
                'winner': board.winner,
                'state': board.to_dict(for_player=player)
            })

        # Switch turn to AI (Player 2)
        board.current_turn = 2

        # Execute AI Player 2 move automatically
        ai_move = ai.choose_move(board, simulations=50)
        if ai_move:
            (ai_sr, ai_sc), (ai_tr, ai_tc) = ai_move
            ai_piece_key = board.grid[ai_sr][ai_sc]['piece']  # log before move
            execute_move(board, ai_move)
            _log_move(game_id, 2, ai_piece_key or '?', ai_sr, ai_sc, ai_tr, ai_tc, 'AI')

        # Check if AI just won (flag capture or immobilization)
        if board.game_over:
            # Still switch turn back so frontend knows whose turn it would have been
            board.current_turn = 1
            return Response({
                'status': 'game_over',
                'winner': board.winner,
                'ai_move': ai_move,
                'state': board.to_dict(for_player=player)
            })

        # Switch turn back to Player 1
        board.current_turn = 1

        return Response({
            'status': 'success',
            'current_turn': 1,
            'ai_move': ai_move,
            'state': board.to_dict(for_player=player)
        })
