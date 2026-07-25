<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { gameState, handleCellClick } from '../composables/useGame'
import { getArmy, getPiece, TILE_COLORS, isMobile } from '../data/armies'

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const BOARD_SIZE = 10
const PADDING = 8
const GAP = 2
let CELL = 52
// Pre-generated decorations (stable, no Math.random in render loop)
let bgDecorations: { x: number; y: number; r: number }[] = []

function generateBgDecorations(w: number, h: number) {
  bgDecorations = []
  // Use a simple deterministic hash instead of Math.random
  let seed = 42
  function pseudoRandom() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  for (let i = 0; i < 40; i++) {
    bgDecorations.push({
      x: pseudoRandom() * w,
      y: pseudoRandom() * h,
      r: 15 + pseudoRandom() * 40
    })
  }
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const maxW = Math.min(window.innerWidth - 420, 600)
  CELL = Math.max(36, Math.floor((maxW - PADDING * 2 - GAP * (BOARD_SIZE - 1)) / BOARD_SIZE))
  canvas.width = BOARD_SIZE * CELL + (BOARD_SIZE - 1) * GAP + PADDING * 2
  canvas.height = canvas.width
  generateBgDecorations(canvas.width, canvas.height)
  draw()
}

function cellXY(row: number, col: number) {
  return { x: PADDING + col * (CELL + GAP), y: PADDING + row * (CELL + GAP) }
}

function getCellFromEvent(ev: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const col = Math.floor((ev.clientX - rect.left - PADDING) / (CELL + GAP))
  const row = Math.floor((ev.clientY - rect.top - PADDING) / (CELL + GAP))
  if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return null
  return { row, col }
}

function drawWaterlooBackground() {
  if (!ctx || !canvasRef.value) return
  const { width, height } = canvasRef.value
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  grad.addColorStop(0, '#2d1f0e')
  grad.addColorStop(0.3, '#3d2b1a')
  grad.addColorStop(0.5, '#4a3728')
  grad.addColorStop(0.6, '#3a4a30')
  grad.addColorStop(0.8, '#2a3518')
  grad.addColorStop(1, '#1a2010')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(200,195,180,0.03)'
  for (const d of bgDecorations) {
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r, 0, 2 * Math.PI)
    ctx.fill()
  }
}

const LAKES = new Set([
  '4,2', '4,3', '5,2', '5,3', '4,6', '4,7', '5,6', '5,7'
])
function isLake(r: number, c: number): boolean { return LAKES.has(`${r},${c}`) }

function drawLake(x: number, y: number) {
  if (!ctx) return
  const grad = ctx.createLinearGradient(x, y, x, y + CELL)
  grad.addColorStop(0, '#1a3a5c')
  grad.addColorStop(0.5, '#1e4d7a')
  grad.addColorStop(1, '#163a58')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, CELL, CELL)
  // Wave pattern
  ctx.strokeStyle = 'rgba(88,166,255,0.25)'
  ctx.lineWidth = 1
  for (let wy = 0; wy < 3; wy++) {
    const baseY = y + CELL * 0.2 + wy * (CELL * 0.25)
    ctx.beginPath()
    for (let wx = 0; wx <= CELL; wx += 2) {
      const sy = baseY + Math.sin((wx + wy * 10) * 0.3) * 2.5
      if (wx === 0) ctx.moveTo(x + wx, sy)
      else ctx.lineTo(x + wx, sy)
    }
    ctx.stroke()
  }
}

function drawCell(row: number, col: number) {
  if (!ctx) return
  const { x, y } = cellXY(row, col)

  // Draw lake cells and return early
  if (isLake(row, col)) {
    drawLake(x, y)
    return
  }

  const cell = gameState.grid[row]?.[col]
  if (!cell) return

  const isOwnPiece = cell.player === gameState.myPlayer
  const isDark = (row + col) % 2 === 0
  ctx.fillStyle = isDark ? 'rgba(30,25,15,0.6)' : 'rgba(45,38,25,0.6)'
  ctx.fillRect(x, y, CELL, CELL)

  // Zone tinting
  if (cell.player === 0) {
    if (row < 4) ctx.fillStyle = 'rgba(196,30,58,0.1)'
    else if (row >= 6) ctx.fillStyle = 'rgba(27,58,92,0.1)'
    else ctx.fillStyle = 'rgba(50,40,25,0.2)'
    ctx.fillRect(x, y, CELL, CELL)
  }

  // Highlight valid moves
  if (gameState.selectedCell && isMobile(gameState.grid[gameState.selectedCell.r]?.[gameState.selectedCell.c]?.piece ?? null)) {
    const sr = gameState.selectedCell.r, sc = gameState.selectedCell.c
    const piece = gameState.grid[sr]?.[sc]?.piece
    if (piece === 'scout') {
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        let rr = sr + dr, cc = sc + dc
        while (rr >= 0 && rr < 10 && cc >= 0 && cc < 10 && !isLake(rr, cc)) {
          const tc = gameState.grid[rr]?.[cc]
          if (!tc || tc.player === gameState.myPlayer) break
          if (rr === row && cc === col) {
            ctx.fillStyle = 'rgba(88,166,255,0.25)'
            ctx.fillRect(x, y, CELL, CELL)
          }
          if (tc.player !== 0) break
          rr += dr; cc += dc
        }
      }
    } else {
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = sr + dr, nc = sc + dc
        if (nr === row && nc === col && !isLake(nr, nc)) {
          const tc = gameState.grid[nr]?.[nc]
          if (tc && tc.player !== gameState.myPlayer) {
            ctx.fillStyle = 'rgba(88,166,255,0.25)'
            ctx.fillRect(x, y, CELL, CELL)
          }
        }
      }
    }
  }

  // Selected cell highlight
  if (gameState.selectedCell?.r === row && gameState.selectedCell?.c === col) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3
    ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2)
  }

  if (cell.player !== 0 && cell.piece) {
    const isVisible = cell.revealed || isOwnPiece
    if (!isVisible) drawHiddenPiece(x, y, cell.player)
    else drawPiece(x, y, cell)
  }
}

function drawHiddenPiece(x: number, y: number, player: number) {
  if (!ctx) return
  const army = getArmy(player)
  ctx.fillStyle = army.color
  ctx.beginPath()
  ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 4)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${CELL * 0.5}px sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('?', x + CELL / 2, y + CELL / 2)
}

function drawPiece(x: number, y: number, cell: { player: number; piece: string | null }) {
  if (!ctx || !cell.piece) return
  const army = getArmy(cell.player)
  const piece = getPiece(army, cell.piece)
  if (!piece) {
    drawHiddenPiece(x, y, cell.player)
    return
  }
  const mode = gameState.displayMode
  if (mode === 'numbers') drawPieceNumbers(x, y, army, piece)
  else if (mode === 'colors') drawPieceColors(x, y, army, piece)
  else drawPieceLissajous(x, y, army, piece)

  // Visual indicator for immobile pieces (bomb, flag)
  if (!isMobile(cell.piece) && cell.player === gameState.myPlayer) {
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 3])
    ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4)
    ctx.setLineDash([])
  }
}

function drawPieceNumbers(x: number, y: number, army: ReturnType<typeof getArmy>, piece: ReturnType<typeof getPiece>) {
  if (!ctx || !piece) return
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 4); ctx.fill()
  ctx.strokeStyle = army.color; ctx.lineWidth = 2; ctx.stroke()
  const rankText = piece.rank >= 0 ? String(piece.rank) : '💣'
  ctx.fillStyle = piece.rank >= 10 ? '#FFD700' : piece.rank >= 7 ? '#f0883e' : '#c9d1d9'
  ctx.font = `bold ${CELL * 0.35}px sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(rankText, x + CELL / 2, y + CELL * 0.38)
  ctx.fillStyle = '#8b949e'
  ctx.font = `${Math.max(CELL * 0.15, 7)}px sans-serif`
  ctx.fillText(piece.short, x + CELL / 2, y + CELL * 0.7)
}

function drawPieceColors(x: number, y: number, army: ReturnType<typeof getArmy>, piece: ReturnType<typeof getPiece>) {
  if (!ctx || !piece) return
  ctx.fillStyle = TILE_COLORS[piece.key] || '#555'
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 4); ctx.fill()
  ctx.strokeStyle = army.accent; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.font = `${CELL * 0.4}px sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(piece.emoji, x + CELL / 2, y + CELL / 2)
}

function drawPieceLissajous(x: number, y: number, army: ReturnType<typeof getArmy>, piece: ReturnType<typeof getPiece>) {
  if (!ctx || !piece) return
  ctx.fillStyle = '#161b22'
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 4); ctx.fill()
  ctx.strokeStyle = army.accent; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.save()
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, CELL - 6, CELL - 6, 4); ctx.clip()
  const cx = x + CELL / 2, cy = y + CELL / 2, R = CELL * 0.28
  const fx = 1 + (Math.abs(piece.rank) % 4), fy = 2 + (Math.abs(piece.rank) % 3)
  ctx.strokeStyle = army.accent; ctx.lineWidth = 1.2; ctx.beginPath()
  const steps = 200 * Math.max(fx, fy), dt = (2 * Math.PI * Math.max(fx, fy)) / steps
  let first = true
  for (let t = 0; t <= 2 * Math.PI * Math.max(fx, fy); t += dt) {
    const sx = cx + R * Math.sin(fx * t), sy = cy + R * Math.sin(fy * t)
    if (first) { ctx.moveTo(sx, sy); first = false } else ctx.lineTo(sx, sy)
  }
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = `${Math.max(CELL * 0.12, 6)}px sans-serif`
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
  ctx.fillText(piece.short, x + CELL - 4, y + CELL - 2)
}

function draw() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  drawWaterlooBackground()
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      drawCell(r, c)
}

function onClick(ev: MouseEvent) {
  if (gameState.gameOver) return
  const cell = getCellFromEvent(ev)
  if (!cell) return
  handleCellClick(cell.row, cell.col)
}

function onContextMenu(ev: MouseEvent) {
  ev.preventDefault()
  gameState.selectedCell = null
  draw()
}

// Watch gameState for changes → redraw only when needed (no 60fps loop!)
watch(
  () => [gameState.grid, gameState.selectedCell, gameState.displayMode, gameState.gameOver],
  () => draw(),
  { deep: true }
)

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null
  resize()
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <canvas
    ref="canvasRef"
    @click="onClick"
    @contextmenu="onContextMenu"
  />
</template>
