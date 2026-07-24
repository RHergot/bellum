import pytest
from game_engine.stratego_logic import StrategoBoard, create_army_pieces
from game_engine.ismcts import ISMCTSAI

def test_board_creation():
    board = StrategoBoard()
    assert board.grid[0][0]['player'] == 0
    assert not board.is_lake(0, 0)
    assert board.is_lake(4, 2)

def test_army_creation():
    pieces = create_army_pieces()
    assert len(pieces) == 40
    assert 'marshal' in pieces
    assert 'flag' in pieces

def test_ai_move():
    board = StrategoBoard()
    # Place a piece for player 1 and player 2
    board.grid[6][0] = {'player': 1, 'piece': 'sergeant', 'revealed': False}
    board.grid[5][0] = {'player': 2, 'piece': 'sergeant', 'revealed': False}
    
    ai = ISMCTSAI(ai_player=2)
    moves = ai.get_legal_moves(board, 2)
    assert len(moves) > 0
