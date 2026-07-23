/**
 * ============================================================
 *  Bellum — Jeu de stratégie à pièces cachées (app.js)
 *  Romains ⚔️ vs Napoléon 🎩 — Plateau 10×10
 * ============================================================
 */

// ============================================================
// CONFIG
// ============================================================
const BOARD_SIZE = 10;
let CELL = 52;
const GAP = 2;
const PADDING = 8;
const PLAYER_ROWS = 4; // Chaque joueur occupe ses 4 premières lignes

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// ============================================================
// ARMIES
// ============================================================

/**
 * Chaque pièce = { key, rank, name, count, emoji }
 * rank 10 = le plus fort, rank -1 = mine, rank 0 = drapeau
 * Règle : le grade le plus élevé gagne. Égalité = destruction mutuelle.
 * Exception : Spy (1) tue Marshal (10) si Spy attaque.
 * Exception : Miner (3) désamorce Bomb (-1).
 * Flag (0) et Bomb (-1) sont immobiles.
 * Scout (2) peut se déplacer de plusieurs cases en ligne droite.
 */
const ROMANS = {
  name: 'Romains', color: '#C41E3A', accent: '#FFD700',
  pieces: [
    { key:'marshal',   rank:10, name:'Legatus',         short:'LEG', count: 1, emoji:'🏛️' },
    { key:'general',   rank: 9, name:'Tribunus Lat.',   short:'TRI', count: 1, emoji:'⚜️' },
    { key:'colonel',   rank: 8, name:'Praefectus',      short:'PRA', count: 2, emoji:'🛡️' },
    { key:'major',     rank: 7, name:'Tribunus Ang.',   short:'ANG', count: 3, emoji:'⚔️' },
    { key:'captain',   rank: 6, name:'Primus Pilus',    short:'PIL', count: 4, emoji:'🗡️' },
    { key:'lieutenant',rank: 5, name:'Centurio',        short:'CEN', count: 4, emoji:'🪖' },
    { key:'sergeant',  rank: 4, name:'Optio',           short:'OPT', count: 4, emoji:'🏹' },
    { key:'miner',     rank: 3, name:'Aquilifer',       short:'AQU', count: 5, emoji:'🦅' },
    { key:'scout',     rank: 2, name:'Speculator',      short:'SPE', count: 8, emoji:'🐴' },
    { key:'spy',       rank: 1, name:'Explorator',      short:'EXP', count: 1, emoji:'🕵️' },
    { key:'flag',      rank: 0, name:'Vexillum',        short:'VEX', count: 1, emoji:'🚩' },
    { key:'bomb',      rank:-1, name:'Stimulus',        short:'STI', count: 6, emoji:'💣' },
  ]
};

const NAPOLEON = {
  name: 'Napoléon', color: '#1B3A5C', accent: '#D4AF37',
  pieces: [
    { key:'marshal',   rank:10, name:'Maréchal',        short:'MAR', count: 1, emoji:'🎩' },
    { key:'general',   rank: 9, name:'Général Div.',    short:'GDV', count: 1, emoji:'⭐' },
    { key:'colonel',   rank: 8, name:'Général Brg.',    short:'GBR', count: 2, emoji:'🎖️' },
    { key:'major',     rank: 7, name:'Colonel',          short:'COL', count: 3, emoji:'🪖' },
    { key:'captain',   rank: 6, name:'Chef Bat.',       short:'CBA', count: 4, emoji:'⚔️' },
    { key:'lieutenant',rank: 5, name:'Capitaine',        short:'CAP', count: 4, emoji:'🛡️' },
    { key:'sergeant',  rank: 4, name:'Lieutenant',       short:'LTN', count: 4, emoji:'🗡️' },
    { key:'miner',     rank: 3, name:'Sapeur',           short:'SAP', count: 5, emoji:'⛏️' },
    { key:'scout',     rank: 2, name:'Éclaireur',        short:'ECL', count: 8, emoji:'🐎' },
    { key:'spy',       rank: 1, name:'Agent secret',     short:'AGT', count: 1, emoji:'🕵️' },
    { key:'flag',      rank: 0, name:'Aigle impérial',   short:'AIG', count: 1, emoji:'🦅' },
    { key:'bomb',      rank:-1, name:'Mine',             short:'MIN', count: 6, emoji:'💣' },
  ]
};

// ============================================================
// PIECE UTILS
// ============================================================

/** Lookup rank by key */
function getRank(army, pieceKey) {
  const p = army.pieces.find(p => p.key === pieceKey);
  return p ? p.rank : 0;
}

/** Get full piece info */
function getPiece(army, pieceKey) {
  return army.pieces.find(p => p.key === pieceKey) || null;
}

/** Get army by player (1 or 2) */
function getArmy(player) { return player === 1 ? ROMANS : NAPOLEON; }

/** Is the piece mobile? (not flag, not bomb) */
function isMobile(pieceKey) {
  return pieceKey !== 'flag' && pieceKey !== 'bomb';
}

// ============================================================
// STATE
// ============================================================

/**
 * Cell = {
 *   player: 0 | 1 | 2,   // 0 = vide
 *   piece:  string,       // key de la pièce
 *   visible: bool,        // révélée à l'adversaire (combat ou position connue)
 * }
 * board[row][col]
 */
let board = [];
let currentPlayer = 1;           // 1: Romans, 2: Napoléon
let phase = 'placement';         // 'placement' | 'battle'
let selectedCell = null;         // { row, col }
let displayMode = 'numbers';
let gameOver = false;
let winner = null;

/** Compteur de pièces restantes à placer */
let remainingToPlace = {};

// ============================================================
// INIT BOARD
// ============================================================

function initBoard() {
  board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    board[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      board[r][c] = { player: 0, piece: null, visible: false };
    }
  }
  currentPlayer = 1;
  phase = 'placement';
  selectedCell = null;
  gameOver = false;
  winner = null;

  // Reset remaining pieces for both players (for placement)
  [ROMANS, NAPOLEON].forEach(army => {
    const key = army.name;
    remainingToPlace[key] = [];
    army.pieces.forEach(p => {
      for (let i = 0; i < p.count; i++) {
        remainingToPlace[key].push(p.key);
      }
    });
    // Shuffle the placement order
    remainingToPlace[key] = shuffleArray([...remainingToPlace[key]]);
  });
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Auto-fill remaining pieces for a player (random placement on their 4 rows) */
function autoFillPlayer(player) {
  const army = getArmy(player);
  const key = army.name;

  // Collect all cells in player's zone
  const zone = [];
  if (player === 1) {
    for (let r = 0; r < PLAYER_ROWS; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c].player !== 1) zone.push({r,c});
  } else {
    for (let r = BOARD_SIZE - PLAYER_ROWS; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c].player !== 2) zone.push({r,c});
  }

  // Shuffle placement positions
  for (let i = zone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zone[i], zone[j]] = [zone[j], zone[i]];
  }

  let idx = 0;
  const remaining = remainingToPlace[key];
  while (remaining.length > 0 && idx < zone.length) {
    const { r, c } = zone[idx];
    board[r][c] = { player, piece: remaining.pop(), visible: false };
    idx++;
  }
}

// ============================================================
// PLACEMENT
// ============================================================

function isInPlayerZone(player, row) {
  if (player === 1) return row >= 0 && row < PLAYER_ROWS;
  return row >= BOARD_SIZE - PLAYER_ROWS && row < BOARD_SIZE;
}

function onPlacementClick(row, col) {
  const army = getArmy(currentPlayer);
  const key = army.name;
  const remaining = remainingToPlace[key];

  if (remaining.length === 0) return;

  // Only allow placement in player's zone
  if (!isInPlayerZone(currentPlayer, row)) return;

  // Can only place on empty cells
  if (board[row][col].player !== 0) {
    // Remove piece from this cell and put it back in the pool
    const oldPiece = board[row][col].piece;
    board[row][col] = { player: 0, piece: null, visible: false };
    remaining.push(oldPiece);
    draw();
    return;
  }

  // Place next piece from pool
  const piece = remaining.pop();
  board[row][col] = { player: currentPlayer, piece, visible: false };
  draw();
}

function readyPlayer() {
  const army = getArmy(currentPlayer);
  const key = army.name;
  const remaining = remainingToPlace[key];

  // Auto-fill if pieces remain
  if (remaining.length > 0) {
    autoFillPlayer(currentPlayer);
  }

  if (currentPlayer === 1) {
    currentPlayer = 2;
    document.getElementById('phaseDisplay').textContent =
      `Phase : Placement — 🎩 ${NAPOLEON.name}`;
  } else {
    phase = 'battle';
    currentPlayer = 1;
    document.getElementById('phaseDisplay').textContent =
      'Phase : ⚔️ Bataille !';
    document.getElementById('btnReady').style.display = 'none';
  }
  draw();
  updateStatus();
}

// ============================================================
// BATTLE — MOVEMENT + CAPTURE
// ============================================================

/** Can player move this piece? */
function isPlayerPiece(row, col, player) {
  return board[row][col].player === player;
}

/** Get straight-line moves for scouts */
function getScoutMoves(row, col) {
  const moves = [];
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      if (board[r][c].player !== 0) {
        if (board[r][c].player !== currentPlayer) moves.push({r, c});
        break;
      }
      moves.push({r, c});
      r += dr; c += dc;
    }
  }
  return moves;
}

/** Get valid moves for pieceKey at (row, col) */
function getValidMoves(row, col) {
  const piece = board[row][col].piece;
  if (!piece) return [];
  if (!isMobile(piece)) return []; // Flag and Bomb are immobile

  if (piece === 'scout') {
    return getScoutMoves(row, col);
  }

  // Normal: 1 step in any direction
  const moves = [];
  const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
  for (const [dr, dc] of dirs) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
    if (board[r][c].player === currentPlayer) continue; // Can't move onto own piece
    moves.push({r, c});
  }
  return moves;
}

/**
 * Resolve combat: attacker moves onto defender.
 * Returns { attackerSurvives, defenderName, attackerName, result }
 */
function resolveCombat(attRow, attCol, defRow, defCol) {
  const attArmy = getArmy(currentPlayer);
  const defArmy = getArmy(3 - currentPlayer);
  const attPiece = board[attRow][attCol].piece;
  const defPiece = board[defRow][defCol].piece;
  const attRank = getRank(attArmy, attPiece);
  const defRank = getRank(defArmy, defPiece);

  const attName = getPiece(attArmy, attPiece).name;
  const defName = getPiece(defArmy, defPiece).name;

  let attWins = false, defWins = false;

  // Spy (1) attacking Marshal (10): spy wins
  if (attRank === 1 && defRank === 10) { attWins = true; defWins = false; }
  // Miner (3) attacking Bomb (-1): miner defuses bomb
  else if (attRank === 3 && defRank === -1) { attWins = true; defWins = false; }
  // Non-miner attacking Bomb: attacker dies
  else if (defRank === -1) { attWins = false; defWins = true; }
  // Attacking Flag: instant win
  else if (defRank === 0) { attWins = true; defWins = false; }
  // Normal combat: higher rank wins, equal = both die
  else if (attRank > defRank) { attWins = true; defWins = false; }
  else if (attRank < defRank) { attWins = false; defWins = true; }
  else { attWins = false; defWins = false; } // égalité = les deux meurent

  return { attWins, defWins, attName, defName, defRank, attRank };
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  const movingPiece = board[fromRow][fromCol].piece;

  if (board[toRow][toCol].player === 0) {
    // Empty square: just move
    board[toRow][toCol] = { ...board[fromRow][fromCol] };
    board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
  } else {
    // Combat!
    const result = resolveCombat(fromRow, fromCol, toRow, toCol);

    if (result.defRank === 0) {
      // Flag captured!
      gameOver = true;
      winner = currentPlayer;
    }

    if (result.attWins && result.defWins) {
      // Both die (impossible for combat, but just in case)
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
      board[toRow][toCol] = { player: 0, piece: null, visible: false };
    } else if (result.attWins) {
      board[toRow][toCol] = { ...board[fromRow][fromCol], visible: true };
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
    } else if (result.defWins) {
      // Defender wins: attacker dies, defender stays (revealed)
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
      board[toRow][toCol].visible = true;
    } else {
      // Both die (égalité)
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
      board[toRow][toCol] = { player: 0, piece: null, visible: false };
    }
  }

  // Check win condition: no mobile pieces left
  if (!gameOver) {
    let mobileLeft = 0;
    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c].player === 3 - currentPlayer && isMobile(board[r][c].piece))
          mobileLeft++;
    if (mobileLeft === 0) { gameOver = true; winner = currentPlayer; }
  }
}

// ============================================================
// BATTLE CLICK HANDLING
// ============================================================

function onBattleClick(row, col) {
  const cell = board[row][col];

  // No selection yet: select own piece
  if (!selectedCell) {
    if (isPlayerPiece(row, col, currentPlayer) && isMobile(cell.piece)) {
      selectedCell = { row, col };
    }
    return;
  }

  const sr = selectedCell.row, sc = selectedCell.col;

  // Clicking same cell: deselect
  if (sr === row && sc === col) {
    selectedCell = null;
    return;
  }

  // Clicking another of our pieces: reselect
  if (isPlayerPiece(row, col, currentPlayer)) {
    selectedCell = { row, col };
    return;
  }

  // Try to move
  const validMoves = getValidMoves(sr, sc);
  const isValid = validMoves.some(m => m.r === row && m.c === col);

  if (isValid) {
    movePiece(sr, sc, row, col);
    selectedCell = null;

    if (!gameOver) {
      // Switch turns
      currentPlayer = 3 - currentPlayer;
    }
  } else {
    selectedCell = null; // Invalid target
  }

  draw();
  updateStatus();
}

// ============================================================
// RENDER
// ============================================================

const TILE_COLORS = {
  marshal:'#FF0000', general:'#FF4500', colonel:'#FF8C00', major:'#FFD700',
  captain:'#32CD32', lieutenant:'#228B22', sergeant:'#4682B4',
  miner:'#8A2BE2', scout:'#00CED1', spy:'#FF69B4', flag:'#FFFFFF', bomb:'#333333'
};

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 270, 600);
  CELL = Math.max(36, Math.floor((maxW - PADDING*2 - GAP*(BOARD_SIZE-1)) / BOARD_SIZE));
  canvas.width = BOARD_SIZE * CELL + (BOARD_SIZE-1) * GAP + PADDING * 2;
  canvas.height = canvas.width;
}

/** Get cell coordinates in pixel */
function cellXY(row, col) {
  return {
    x: PADDING + col * (CELL + GAP),
    y: PADDING + row * (CELL + GAP),
  };
}

function drawWaterlooBackground() {
  // Morne plaine: dégradé vertical brun → gris → vert olive
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#2d1f0e');   // Brun sombre (terre)
  grad.addColorStop(0.3, '#3d2b1a'); // Brun moyen
  grad.addColorStop(0.5, '#4a3728'); // Milieu
  grad.addColorStop(0.6, '#3a4a30'); // Vert olive
  grad.addColorStop(0.8, '#2a3518'); // Vert foncé
  grad.addColorStop(1, '#1a2010');   // Vert très foncé
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Particules de brume (brume de Waterloo)
  ctx.fillStyle = 'rgba(200,195,180,0.03)';
  for (let i = 0; i < 40; i++) {
    const bx = Math.random() * canvas.width;
    const by = Math.random() * canvas.height;
    const br = 15 + Math.random() * 40;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, 2*Math.PI);
    ctx.fill();
  }
}

function drawCell(row, col) {
  const { x, y } = cellXY(row, col);
  const cell = board[row][col];
  const isOwnPiece = cell.player === currentPlayer || (phase === 'placement' && cell.player === currentPlayer);
  const isEnemyPiece = cell.player !== 0 && cell.player !== currentPlayer && phase === 'battle';
  const isVisible = cell.visible || isOwnPiece || phase === 'placement';

  // Background tile
  const isDark = (row + col) % 2 === 0;
  ctx.fillStyle = isDark ? 'rgba(30,25,15,0.6)' : 'rgba(45,38,25,0.6)';
  ctx.fillRect(x, y, CELL, CELL);

  // Player zone highlights
  if (cell.player === 0) {
    if (row < PLAYER_ROWS)
      ctx.fillStyle = 'rgba(196,30,58,0.1)';   // Zone romaine
    else if (row >= BOARD_SIZE - PLAYER_ROWS)
      ctx.fillStyle = 'rgba(27,58,92,0.1)';    // Zone napoléonienne
    else
      ctx.fillStyle = 'rgba(50,40,25,0.2)';    // No man's land
    ctx.fillRect(x, y, CELL, CELL);
  }

  // Valid move highlight
  if (selectedCell && phase === 'battle') {
    const moves = getValidMoves(selectedCell.row, selectedCell.col);
    if (moves.some(m => m.r === row && m.c === col)) {
      ctx.fillStyle = 'rgba(88,166,255,0.25)';
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  // Selection highlight
  if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  // Draw piece
  if (cell.player !== 0 && cell.piece) {
    if (!isVisible) {
      drawHiddenPiece(x, y, cell.player);
    } else {
      drawPiece(x, y, cell);
    }
  }
}

function drawHiddenPiece(x, y, player) {
  // Piece face cachée
  const army = getArmy(player);
  const r = 4;
  ctx.fillStyle = army.color;
  ctx.beginPath();
  ctx.moveTo(x + 5 + r, y + 5);
  ctx.lineTo(x + CELL - 5 - r, y + 5);
  ctx.arcTo(x + CELL - 5, y + 5, x + CELL - 5, y + 5 + r, r);
  ctx.lineTo(x + CELL - 5, y + CELL - 5 - r);
  ctx.arcTo(x + CELL - 5, y + CELL - 5, x + CELL - 5 - r, y + CELL - 5, r);
  ctx.lineTo(x + 5 + r, y + CELL - 5);
  ctx.arcTo(x + 5, y + CELL - 5, x + 5, y + CELL - 5 - r, r);
  ctx.lineTo(x + 5, y + 5 + r);
  ctx.arcTo(x + 5, y + 5, x + 5 + r, y + 5, r);
  ctx.fill();

  // Symbole "?"
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${CELL*0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x + CELL/2, y + CELL/2);
}

function drawPiece(x, y, cell) {
  const army = getArmy(cell.player);
  const piece = getPiece(army, cell.piece);
  if (!piece) return;
  const r = 4;

  switch (displayMode) {
    case 'numbers':
      drawPieceNumbers(x, y, army, piece, r);
      break;
    case 'colors':
      drawPieceColors(x, y, army, piece, r);
      break;
    case 'lissajous':
      drawPieceLissajous(x, y, army, piece, r);
      break;
  }
}

function drawPieceNumbers(x, y, army, piece, r) {
  // Fond de la pièce
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, r);
  ctx.fill();

  // Bordure couleur armée
  ctx.strokeStyle = army.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rang (gros)
  const rankText = piece.rank >= 0 ? String(piece.rank) : '💣';
  ctx.fillStyle = piece.rank >= 10 ? '#FFD700' : piece.rank >= 7 ? '#f0883e' : '#c9d1d9';
  ctx.font = `bold ${CELL*0.35}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rankText, x + CELL/2, y + CELL*0.38);

  // Nom court
  ctx.fillStyle = '#8b949e';
  ctx.font = `${Math.max(CELL*0.15, 7)}px sans-serif`;
  ctx.fillText(piece.short, x + CELL/2, y + CELL*0.7);
}

function drawPieceColors(x, y, army, piece, r) {
  const tileColor = TILE_COLORS[piece.key] || '#555';
  ctx.fillStyle = tileColor;
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, r);
  ctx.fill();

  // Bordure armée
  ctx.strokeStyle = army.accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Emoji
  ctx.font = `${CELL*0.4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(piece.emoji, x + CELL/2, y + CELL/2);
}

function drawPieceLissajous(x, y, army, piece, r) {
  // Fond sombre
  ctx.fillStyle = '#161b22';
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, r);
  ctx.fill();

  ctx.strokeStyle = army.accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Lissajous unique par rang
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, r);
  ctx.clip();

  const cx = x + CELL/2, cy = y + CELL/2;
  const R = CELL * 0.28;
  const fx = 1 + (Math.abs(piece.rank) % 4);
  const fy = 2 + (Math.abs(piece.rank) % 3);

  ctx.strokeStyle = army.accent;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const steps = 200 * Math.max(fx, fy);
  const dt = (2 * Math.PI * Math.max(fx, fy)) / steps;
  let first = true;
  for (let t = 0; t <= 2 * Math.PI * Math.max(fx, fy); t += dt) {
    const sx = cx + R * Math.sin(fx * t);
    const sy = cy + R * Math.sin(fy * t);
    if (first) { ctx.moveTo(sx, sy); first = false; }
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // Rang discret
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `${Math.max(CELL*0.12, 6)}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(piece.short, x + CELL - 4, y + CELL - 2);

  ctx.restore();
}

// ============================================================
// MAIN DRAW
// ============================================================

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWaterlooBackground();

  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      drawCell(r, c);
}

// ============================================================
// STATUS
// ============================================================

function updateStatus() {
  if (gameOver) {
    const wname = winner === 1 ? '⚔️ Romains' : '🎩 Napoléon';
    document.getElementById('phaseDisplay').textContent = `🏆 Victoire — ${wname} !`;
    document.getElementById('turnDisplay').textContent = '';
    return;
  }

  if (phase === 'placement') {
    const army = getArmy(currentPlayer);
    const key = army.name;
    const r = remainingToPlace[key].length;
    document.getElementById('turnDisplay').textContent =
      `Pièces restantes : ${r}`;
  } else {
    const pname = currentPlayer === 1 ? '⚔️ Romains' : '🎩 Napoléon';
    document.getElementById('turnDisplay').textContent = `Tour : ${pname}`;
  }
}

// ============================================================
// EVENTS
// ============================================================

function getCellFromEvent(ev) {
  const rect = canvas.getBoundingClientRect();
  const mx = ev.clientX - rect.left;
  const my = ev.clientY - rect.top;
  const col = Math.floor((mx - PADDING) / (CELL + GAP));
  const row = Math.floor((my - PADDING) / (CELL + GAP));
  if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return null;
  return { row, col };
}

function bindCanvasEvents() {
  canvas.addEventListener('click', (ev) => {
    if (gameOver) return;
    const cell = getCellFromEvent(ev);
    if (!cell) return;

    if (phase === 'placement') {
      onPlacementClick(cell.row, cell.col);
      draw();
      updateStatus();
      return;
    }

    onBattleClick(cell.row, cell.col);
  });

  canvas.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    if (gameOver || phase !== 'battle') return;
    selectedCell = null;
    draw();
  });
}

function bindButtons() {
  document.getElementById('btnReady').addEventListener('click', readyPlayer);
  document.getElementById('btnReset').addEventListener('click', () => {
    initBoard();
    document.getElementById('btnReady').style.display = '';
    document.getElementById('phaseDisplay').textContent = 'Phase : Placement — ⚔️ Romains';
    resizeCanvas();
    draw();
    updateStatus();
  });
}

function bindModeSwitch() {
  document.getElementById('modeSwitch').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.mode-btn');
    if (!btn) return;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    displayMode = btn.dataset.mode;
    draw();
  });
}

function bindModalEvents() {
  document.getElementById('btnRules').addEventListener('click', () =>
    document.getElementById('modalOverlay').classList.add('show'));
  document.getElementById('modalClose').addEventListener('click', () =>
    document.getElementById('modalOverlay').classList.remove('show'));
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget)
      document.getElementById('modalOverlay').classList.remove('show');
  });
}

// ============================================================
// INIT
// ============================================================

function init() {
  resizeCanvas();
  initBoard();
  bindCanvasEvents();
  bindButtons();
  bindModeSwitch();
  bindModalEvents();
  draw();
  updateStatus();

  window.addEventListener('resize', () => { resizeCanvas(); draw(); });
}

init();
