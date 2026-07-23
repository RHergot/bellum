/**
 * ============================================================
 *  Bellum — Jeu de stratégie à pièces cachées (app.js)
 *  Romains ⚔️ vs Napoléon 🎩 — Plateau 10×10
 *  v2 : Sidebars de référence + grille de pièces prises
 * ============================================================
 */

// ============================================================
// CONFIG
// ============================================================
const BOARD_SIZE = 10;
let CELL = 52;
const GAP = 2;
const PADDING = 8;
const PLAYER_ROWS = 4;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

// ============================================================
// ARMIES
// ============================================================

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

const TILE_COLORS = {
  marshal:'#FF0000', general:'#FF4500', colonel:'#FF8C00', major:'#FFD700',
  captain:'#32CD32', lieutenant:'#228B22', sergeant:'#4682B4',
  miner:'#8A2BE2', scout:'#00CED1', spy:'#FF69B4', flag:'#FFFFFF', bomb:'#333333'
};

function getRank(army, pieceKey) {
  const p = army.pieces.find(p => p.key === pieceKey);
  return p ? p.rank : 0;
}

function getPiece(army, pieceKey) {
  return army.pieces.find(p => p.key === pieceKey) || null;
}

function getArmy(player) { return player === 1 ? ROMANS : NAPOLEON; }

function isMobile(pieceKey) { return pieceKey !== 'flag' && pieceKey !== 'bomb'; }

// ============================================================
// STATE
// ============================================================

let board = [];           // board[row][col] = { player, piece, visible }
let currentPlayer = 1;
let phase = 'placement';  // 'placement' | 'battle'
let selectedCell = null;
let displayMode = 'numbers';
let gameOver = false;
let winner = null;
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

  [ROMANS, NAPOLEON].forEach(army => {
    remainingToPlace[army.name] = [];
    army.pieces.forEach(p => {
      for (let i = 0; i < p.count; i++) remainingToPlace[army.name].push(p.key);
    });
    remainingToPlace[army.name] = shuffleArray([...remainingToPlace[army.name]]);
  });
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function autoFillPlayer(player) {
  const army = getArmy(player);
  const key = army.name;
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
  const remaining = remainingToPlace[army.name];
  if (remaining.length === 0) return;
  if (!isInPlayerZone(currentPlayer, row)) return;
  if (board[row][col].player !== 0) {
    remaining.push(board[row][col].piece);
    board[row][col] = { player: 0, piece: null, visible: false };
    draw();
    updateStatus();
    updateSidebars();
    return;
  }
  board[row][col] = { player: currentPlayer, piece: remaining.pop(), visible: false };
  draw();
  updateStatus();
  updateSidebars();
}

function readyPlayer() {
  const army = getArmy(currentPlayer);
  const remaining = remainingToPlace[army.name];
  if (remaining.length > 0) autoFillPlayer(currentPlayer);

  if (currentPlayer === 1) {
    currentPlayer = 2;
    document.getElementById('phaseDisplay').textContent =
      'Phase : Placement — 🎩 ' + NAPOLEON.name;
  } else {
    phase = 'battle';
    currentPlayer = 1;
    document.getElementById('phaseDisplay').textContent = 'Phase : ⚔️ Bataille !';
    document.getElementById('btnReady').style.display = 'none';
  }
  draw();
  updateStatus();
  updateSidebars();
}

// ============================================================
// BATTLE
// ============================================================

function isPlayerPiece(row, col, player) {
  return board[row][col].player === player;
}

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

function getValidMoves(row, col) {
  const piece = board[row][col].piece;
  if (!piece || !isMobile(piece)) return [];
  if (piece === 'scout') return getScoutMoves(row, col);
  const moves = [];
  for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
    if (board[r][c].player === currentPlayer) continue;
    moves.push({r, c});
  }
  return moves;
}

function resolveCombat(attRow, attCol, defRow, defCol) {
  const attArmy = getArmy(currentPlayer);
  const defArmy = getArmy(3 - currentPlayer);
  const attRank = getRank(attArmy, board[attRow][attCol].piece);
  const defRank = getRank(defArmy, board[defRow][defCol].piece);
  const attName = getPiece(attArmy, board[attRow][attCol].piece).name;
  const defName = getPiece(defArmy, board[defRow][defCol].piece).name;
  let attWins = false, defWins = false;
  if (attRank === 1 && defRank === 10) { attWins = true; defWins = false; }
  else if (attRank === 3 && defRank === -1) { attWins = true; defWins = false; }
  else if (defRank === -1) { attWins = false; defWins = true; }
  else if (defRank === 0) { attWins = true; defWins = false; }
  else if (attRank > defRank) { attWins = true; defWins = false; }
  else if (attRank < defRank) { attWins = false; defWins = true; }
  else { attWins = false; defWins = false; }
  return { attWins, defWins, attName, defName, defRank, attRank };
}

function movePiece(fromRow, fromCol, toRow, toCol) {
  if (board[toRow][toCol].player === 0) {
    board[toRow][toCol] = { ...board[fromRow][fromCol] };
    board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
  } else {
    const result = resolveCombat(fromRow, fromCol, toRow, toCol);
    if (result.defRank === 0) { gameOver = true; winner = currentPlayer; }
    if (result.attWins) {
      board[toRow][toCol] = { ...board[fromRow][fromCol], visible: true };
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
    } else if (result.defWins) {
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
      board[toRow][toCol].visible = true;
    } else {
      board[fromRow][fromCol] = { player: 0, piece: null, visible: false };
      board[toRow][toCol] = { player: 0, piece: null, visible: false };
    }
  }
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
// BATTLE CLICK
// ============================================================

function onBattleClick(row, col) {
  const cell = board[row][col];
  if (!selectedCell) {
    if (isPlayerPiece(row, col, currentPlayer) && isMobile(cell.piece))
      selectedCell = { row, col };
    return;
  }
  const sr = selectedCell.row, sc = selectedCell.col;
  if (sr === row && sc === col) { selectedCell = null; return; }
  if (isPlayerPiece(row, col, currentPlayer)) { selectedCell = { row, col }; return; }
  const validMoves = getValidMoves(sr, sc);
  if (validMoves.some(m => m.r === row && m.c === col)) {
    movePiece(sr, sc, row, col);
    selectedCell = null;
    if (!gameOver) currentPlayer = 3 - currentPlayer;
  } else { selectedCell = null; }
  draw();
  updateStatus();
  updateSidebars();
}

// ============================================================
// RENDER
// ============================================================

function resizeCanvas() {
  const maxW = Math.min(window.innerWidth - 420, 600);
  CELL = Math.max(36, Math.floor((maxW - PADDING*2 - GAP*(BOARD_SIZE-1)) / BOARD_SIZE));
  canvas.width = BOARD_SIZE * CELL + (BOARD_SIZE-1) * GAP + PADDING * 2;
  canvas.height = canvas.width;
}

function cellXY(row, col) {
  return { x: PADDING + col * (CELL + GAP), y: PADDING + row * (CELL + GAP) };
}

function drawWaterlooBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#2d1f0e');
  grad.addColorStop(0.3, '#3d2b1a');
  grad.addColorStop(0.5, '#4a3728');
  grad.addColorStop(0.6, '#3a4a30');
  grad.addColorStop(0.8, '#2a3518');
  grad.addColorStop(1, '#1a2010');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(200,195,180,0.03)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(Math.random()*canvas.width, Math.random()*canvas.height, 15+Math.random()*40, 0, 2*Math.PI);
    ctx.fill();
  }
}

function drawCell(row, col) {
  const { x, y } = cellXY(row, col);
  const cell = board[row][col];
  const isOwnPiece = cell.player === currentPlayer || (phase === 'placement' && cell.player === currentPlayer);
  const isEnemyPiece = cell.player !== 0 && cell.player !== currentPlayer && phase === 'battle';
  const isVisible = cell.visible || isOwnPiece || phase === 'placement';

  const isDark = (row + col) % 2 === 0;
  ctx.fillStyle = isDark ? 'rgba(30,25,15,0.6)' : 'rgba(45,38,25,0.6)';
  ctx.fillRect(x, y, CELL, CELL);

  if (cell.player === 0) {
    if (row < PLAYER_ROWS) ctx.fillStyle = 'rgba(196,30,58,0.1)';
    else if (row >= BOARD_SIZE - PLAYER_ROWS) ctx.fillStyle = 'rgba(27,58,92,0.1)';
    else ctx.fillStyle = 'rgba(50,40,25,0.2)';
    ctx.fillRect(x, y, CELL, CELL);
  }

  if (selectedCell && phase === 'battle') {
    const moves = getValidMoves(selectedCell.row, selectedCell.col);
    if (moves.some(m => m.r === row && m.c === col)) {
      ctx.fillStyle = 'rgba(88,166,255,0.25)';
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  if (cell.player !== 0 && cell.piece) {
    if (!isVisible) drawHiddenPiece(x, y, cell.player);
    else drawPiece(x, y, cell);
  }
}

function drawHiddenPiece(x, y, player) {
  const army = getArmy(player);
  ctx.fillStyle = army.color;
  ctx.beginPath();
  ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold ' + (CELL*0.5) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('?', x + CELL/2, y + CELL/2);
}

function drawPiece(x, y, cell) {
  const army = getArmy(cell.player);
  const piece = getPiece(army, cell.piece);
  if (!piece) return;
  const r = 4;
  if (displayMode === 'numbers') drawPieceNumbers(x, y, army, piece, r);
  else if (displayMode === 'colors') drawPieceColors(x, y, army, piece, r);
  else drawPieceLissajous(x, y, army, piece, r);
}

function drawPieceNumbers(x, y, army, piece, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.roundRect(x+3, y+3, CELL-6, CELL-6, r); ctx.fill();
  ctx.strokeStyle = army.color; ctx.lineWidth = 2; ctx.stroke();
  const rankText = piece.rank >= 0 ? String(piece.rank) : '💣';
  ctx.fillStyle = piece.rank >= 10 ? '#FFD700' : piece.rank >= 7 ? '#f0883e' : '#c9d1d9';
  ctx.font = 'bold ' + (CELL*0.35) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(rankText, x + CELL/2, y + CELL*0.38);
  ctx.fillStyle = '#8b949e';
  ctx.font = Math.max(CELL*0.15, 7) + 'px sans-serif';
  ctx.fillText(piece.short, x + CELL/2, y + CELL*0.7);
}

function drawPieceColors(x, y, army, piece, r) {
  ctx.fillStyle = TILE_COLORS[piece.key] || '#555';
  ctx.beginPath(); ctx.roundRect(x+3, y+3, CELL-6, CELL-6, r); ctx.fill();
  ctx.strokeStyle = army.accent; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = (CELL*0.4) + 'px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(piece.emoji, x + CELL/2, y + CELL/2);
}

function drawPieceLissajous(x, y, army, piece, r) {
  ctx.fillStyle = '#161b22';
  ctx.beginPath(); ctx.roundRect(x+3, y+3, CELL-6, CELL-6, r); ctx.fill();
  ctx.strokeStyle = army.accent; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x+3, y+3, CELL-6, CELL-6, r); ctx.clip();
  const cx = x + CELL/2, cy = y + CELL/2, R = CELL * 0.28;
  const fx = 1 + (Math.abs(piece.rank) % 4), fy = 2 + (Math.abs(piece.rank) % 3);
  ctx.strokeStyle = army.accent; ctx.lineWidth = 1.2; ctx.beginPath();
  const steps = 200 * Math.max(fx, fy), dt = (2*Math.PI*Math.max(fx,fy))/steps;
  let first = true;
  for (let t = 0; t <= 2*Math.PI*Math.max(fx,fy); t += dt) {
    const sx = cx + R*Math.sin(fx*t), sy = cy + R*Math.sin(fy*t);
    if (first) { ctx.moveTo(sx,sy); first = false; } else ctx.lineTo(sx,sy);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = Math.max(CELL*0.12,6) + 'px sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
  ctx.fillText(piece.short, x + CELL - 4, y + CELL - 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWaterlooBackground();
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++) drawCell(r, c);
}

// ============================================================
// STATUS
// ============================================================

function updateStatus() {
  if (gameOver) {
    const wname = winner === 1 ? '⚔️ Romains' : '🎩 Napoléon';
    document.getElementById('phaseDisplay').textContent = '🏆 Victoire — ' + wname + ' !';
    document.getElementById('turnDisplay').textContent = '';
    return;
  }
  if (phase === 'placement') {
    const army = getArmy(currentPlayer);
    document.getElementById('turnDisplay').textContent =
      'Pièces restantes : ' + remainingToPlace[army.name].length;
  } else {
    const pname = currentPlayer === 1 ? '⚔️ Romains' : '🎩 Napoléon';
    document.getElementById('turnDisplay').textContent = 'Tour : ' + pname;
  }
}

// ============================================================
// SIDEBARS
// ============================================================

function toggleSidebar(side) {
  const content = document.getElementById(side === 'left' ? 'sidebarLeftContent' : 'sidebarRightContent');
  content.classList.toggle('open');
}

function buildReferenceTable(containerId, army) {
  const container = document.getElementById(containerId);
  if (!container) return;
  let html = '';
  army.pieces.forEach(p => {
    const rankClass = p.rank >= 10 ? 'high' : p.rank >= 7 ? 'med' : 'low';
    const rankDisplay = p.rank >= 0 ? String(p.rank) : '💣';
    const tileColor = TILE_COLORS[p.key] || '#555';
    html +=
      '<div class="ref-row">' +
        '<span class="ref-rank ' + rankClass + '">' + rankDisplay + '</span>' +
        '<span class="ref-name" title="' + p.name + '">' + p.short + '</span>' +
        '<span class="ref-count">×' + p.count + '</span>' +
        '<span class="ref-sample" style="background:' + tileColor + ';border:1px solid ' + army.accent + '">' + p.emoji + '</span>' +
      '</div>';
  });
  container.innerHTML = html;
}

function buildCapturedGrid(containerId, player) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const opponent = 3 - player;
  const oppArmy = getArmy(opponent);
  const fullRoster = [];
  oppArmy.pieces.forEach(p => { for (let i = 0; i < p.count; i++) fullRoster.push(p.key); });
  const aliveCount = {};
  oppArmy.pieces.forEach(p => { aliveCount[p.key] = 0; });
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (board[r][c].player === opponent && board[r][c].piece)
        aliveCount[board[r][c].piece] = (aliveCount[board[r][c].piece] || 0) + 1;
  const consumed = {};
  oppArmy.pieces.forEach(p => { consumed[p.key] = 0; });
  let html = '';
  fullRoster.forEach(key => {
    consumed[key] = (consumed[key] || 0) + 1;
    const isAlive = consumed[key] <= (aliveCount[key] || 0);
    html +=
      '<div class="captured-cell ' + (isAlive ? 'active' : 'taken') +
      '" title="' + (isAlive ? 'En vie' : 'Détruite') + '">' +
      (isAlive ? '●' : '○') +
      '</div>';
  });
  container.innerHTML = html;
}

function updateSidebars() {
  buildReferenceTable('refTableRomans', ROMANS);
  buildReferenceTable('refTableNapoleon', NAPOLEON);
  buildCapturedGrid('capturedRomans', 1);
  buildCapturedGrid('capturedNapoleon', 2);
}

function bindSidebarToggles() {
  document.getElementById('toggleLeft').addEventListener('click', () => toggleSidebar('left'));
  document.getElementById('toggleRight').addEventListener('click', () => toggleSidebar('right'));
}

// ============================================================
// EVENTS
// ============================================================

function getCellFromEvent(ev) {
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((ev.clientX - rect.left - PADDING) / (CELL + GAP));
  const row = Math.floor((ev.clientY - rect.top - PADDING) / (CELL + GAP));
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
    updateSidebars();
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
    if (e.target === e.currentTarget) document.getElementById('modalOverlay').classList.remove('show');
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
  bindSidebarToggles();
  draw();
  updateStatus();
  updateSidebars();
  window.addEventListener('resize', () => { resizeCanvas(); draw(); });
}

init();
