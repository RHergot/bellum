import random

# Piece definitions
PIECES_CONFIG = [
    {'key': 'marshal',   'rank': 10, 'count': 1, 'name': 'Marshal'},
    {'key': 'general',   'rank': 9,  'count': 1, 'name': 'General'},
    {'key': 'colonel',   'rank': 8,  'count': 2, 'name': 'Colonel'},
    {'key': 'major',     'rank': 7,  'count': 3, 'name': 'Major'},
    {'key': 'captain',   'rank': 6,  'count': 4, 'name': 'Captain'},
    {'key': 'lieutenant','rank': 5,  'count': 4, 'name': 'Lieutenant'},
    {'key': 'sergeant',  'rank': 4,  'count': 4, 'name': 'Sergeant'},
    {'key': 'miner',     'rank': 3,  'count': 5, 'name': 'Miner'},
    {'key': 'scout',     'rank': 2,  'count': 8, 'name': 'Scout'},
    {'key': 'spy',       'rank': 1,  'count': 1, 'name': 'Spy'},
    {'key': 'flag',      'rank': 0,  'count': 1, 'name': 'Flag'},
    {'key': 'bomb',      'rank': -1, 'count': 6, 'name': 'Bomb'},
]

BOARD_SIZE = 10
LAKES = [(4, 2), (4, 3), (5, 2), (5, 3), (4, 6), (4, 7), (5, 6), (5, 7)]
IMMOBILE_PIECES = ('flag', 'bomb')

def create_army_pieces():
    pieces = []
    for p in PIECES_CONFIG:
        for _ in range(p['count']):
            pieces.append(p['key'])
    random.shuffle(pieces)
    return pieces


def _validate_manual_placement(placement, player):
    """
    Validate a manual piece placement for the given player.
    
    Args:
        placement: list of dicts [{'r': int, 'c': int, 'piece': str}, ...]
        player: 1 or 2
    
    Returns:
        (is_valid: bool, error_message: str or None)
        
    Rules:
        - Exactly 40 pieces
        - All coordinates in [0, BOARD_SIZE-1]
        - All in player's deployment zone (rows 6-9 for P1, 0-3 for P2)
        - No lakes
        - No duplicate coordinates
        - Valid piece keys
        - Correct quantities per type
    """
    if len(placement) != 40:
        return False, f'Expected 40 pièces, got {len(placement)}'

    # Build expected piece counts
    expected_counts = {p['key']: p['count'] for p in PIECES_CONFIG}
    seen_counts = {p['key']: 0 for p in PIECES_CONFIG}
    seen_coords = set()

    min_row = 6 if player == 1 else 0
    max_row = 9 if player == 1 else 3

    for entry in placement:
        r, c, piece = entry['r'], entry['c'], entry['piece']

        # Coordinate validation
        if not (0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE):
            return False, f'Coordonnées hors grille : ({r},{c})'

        # Deployment zone
        if not (min_row <= r <= max_row):
            return False, f'Pièce hors zone de déploiement (rangées {min_row}-{max_row}) : ({r},{c})'

        # Lakes
        if (r, c) in LAKES:
            return False, f'Pièce sur un lac : ({r},{c})'

        # Duplicate coordinates
        coord = (r, c)
        if coord in seen_coords:
            return False, f'Coordonnées en doublon : ({r},{c})'
        seen_coords.add(coord)

        # Valid piece key
        if piece not in expected_counts:
            return False, f'Pièce inconnue : {piece}'

        # Track counts
        seen_counts[piece] += 1

    # Quantity validation
    for key, expected in expected_counts.items():
        if seen_counts[key] != expected:
            return False, f'Quantité incorrecte pour {key} : attendu {expected}, reçu {seen_counts[key]}'

    return True, None

class StrategoBoard:
    def __init__(self):
        # 10x10 grid. Each cell: {'player': 0/1/2, 'piece': key or None, 'revealed': bool}
        self.grid = [[{'player': 0, 'piece': None, 'revealed': False} for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.game_over = False
        self.winner = None
        self.current_turn = 1

    def is_lake(self, r, c):
        return (r, c) in LAKES

    def is_valid_coord(self, r, c):
        return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE

    def resolve_combat(self, attacker_player, attacker_piece, defender_player, defender_piece):
        a_rank = self.get_rank(attacker_piece)
        d_rank = self.get_rank(defender_piece)

        # Flag captured
        if d_rank == 0:
            return 'attacker_win_game'

        # Bomb interaction
        if d_rank == -1:
            if a_rank == 3: # Miner disarms bomb
                return 'attacker_win'
            else:
                return 'defender_win'

        # Spy vs Marshal
        if a_rank == 1 and d_rank == 10:
            return 'attacker_win'

        if a_rank > d_rank:
            return 'attacker_win'
        elif a_rank < d_rank:
            return 'defender_win'
        else:
            return 'both_destroy'

    def get_rank(self, piece_key):
        for p in PIECES_CONFIG:
            if p['key'] == piece_key:
                return p['rank']
        return 0

    def has_mobile_pieces(self, player):
        """Return True if the given player has at least one mobile piece on the board."""
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                cell = self.grid[r][c]
                if cell['player'] == player and cell['piece'] is not None and cell['piece'] not in IMMOBILE_PIECES:
                    return True
        return False

    def check_immobilization_victory(self):
        """Check if either player has no mobile pieces left and set game_over accordingly."""
        for player in (1, 2):
            if not self.has_mobile_pieces(player):
                self.game_over = True
                self.winner = 3 - player  # the other player wins
                return True
        return False

    def to_dict(self, for_player=None):
        # Returns grid view, masking enemy unrevealed pieces if for_player is specified
        visible_grid = []
        for r in range(BOARD_SIZE):
            row = []
            for c in range(BOARD_SIZE):
                cell = self.grid[r][c]
                if cell['player'] == 0 or (for_player and cell['player'] != for_player and not cell['revealed']):
                    row.append({'player': cell['player'], 'piece': 'unknown' if cell['player'] != 0 else None, 'revealed': False})
                else:
                    row.append({'player': cell['player'], 'piece': cell['piece'], 'revealed': cell['revealed']})
            visible_grid.append(row)
        return {
            'grid': visible_grid,
            'game_over': self.game_over,
            'winner': self.winner
        }
