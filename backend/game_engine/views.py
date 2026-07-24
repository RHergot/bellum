from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import uuid
import os
from datetime import datetime
from .stratego_logic import StrategoBoard, create_army_pieces, BOARD_SIZE, LAKES
from .ismcts import ISMCTSAI

# In-memory active games store
ACTIVE_GAMES = {}

LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'game-log.md')


def _log_move(game_id, player, piece, sr, sc, tr, tc, result='move'):
    """Append a move to the game log file."""
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
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

    # Validate using ISMCTS legal moves (covers adjacency, scout range, etc.)
    ai = ISMCTSAI(ai_player=player)
    legal = ai.get_legal_moves(board, player)
    if ((sr, sc), (tr, tc)) not in legal:
        return False, 'Illegal move (not adjacent or blocked)'

    return True, None


class NewGameAPIView(APIView):
    def post(self, request):
        game_id = str(uuid.uuid4())[:8]
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

        ACTIVE_GAMES[game_id] = board
        return Response({
            'game_id': game_id,
            'message': 'New Bellum game started successfully',
            'current_turn': 1,
            'state': board.to_dict(for_player=1)
        })


class GameStateAPIView(APIView):
    def get(self, request, game_id):
        if game_id not in ACTIVE_GAMES:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        board = ACTIVE_GAMES[game_id]
        player = int(request.GET.get('player', 1))
        return Response({
            **board.to_dict(for_player=player),
            'current_turn': getattr(board, 'current_turn', 1)
        })


class MakeMoveAPIView(APIView):
    def post(self, request, game_id):
        if game_id not in ACTIVE_GAMES:
            return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)

        board = ACTIVE_GAMES[game_id]
        data = request.data
        sr = data.get('sr')
        sc = data.get('sc')
        tr = data.get('tr')
        tc = data.get('tc')
        player = int(data.get('player', 1))

        if None in (sr, sc, tr, tc):
            return Response({'error': 'Invalid move coordinates'}, status=status.HTTP_400_BAD_REQUEST)

        if board.game_over:
            return Response({'error': 'Game is over'}, status=status.HTTP_400_BAD_REQUEST)

        if getattr(board, 'current_turn', 1) != player:
            return Response({'error': f'Not your turn (current turn: player {board.current_turn})'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate move
        is_valid, error_msg = _validate_move(board, player, sr, sc, tr, tc)
        if not is_valid:
            return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

        # Execute Player move
        ai = ISMCTSAI(ai_player=2)
        try:
            ai.execute_move(board, ((sr, sc), (tr, tc)))
            src_piece = board.grid[tr][tc]['piece'] if board.grid[tr][tc]['player'] == player else board.grid[sr][sc]['piece']
            _log_move(game_id, player, src_piece or '?', sr, sc, tr, tc, 'move')
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if board.game_over:
            return Response({
                'status': 'game_over',
                'winner': board.winner,
                'state': board.to_dict(for_player=player)
            })

        # Switch turn to AI (Player 2)
        board.current_turn = 2

        # Execute AI Player 2 move automatically
        ai_move = ai.choose_move(board, simulations=20)
        if ai_move:
            ai.execute_move(board, ai_move)
            (ai_sr, ai_sc), (ai_tr, ai_tc) = ai_move
            ai_piece = board.grid[ai_tr][ai_tc]['piece'] if board.grid[ai_tr][ai_tc]['player'] == 2 else board.grid[ai_sr][ai_sc]['piece']
            _log_move(game_id, 2, ai_piece or '?', ai_sr, ai_sc, ai_tr, ai_tc, 'AI')

        # Switch turn back to Player 1
        board.current_turn = 1

        return Response({
            'status': 'success',
            'current_turn': 1,
            'ai_move': ai_move,
            'state': board.to_dict(for_player=player)
        })
