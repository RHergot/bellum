import { ref, computed } from 'vue'
import type { PieceCount, GridPiece, InHandPiece, PlacementMode } from '../types/game'
import { gameState, startNewGame } from './useGame'
import { getArmy } from '../data/armies'

// ─── Reactive placement state ───────────────────────────────

const pool = ref<PieceCount[]>([])
const grid = ref<GridPiece[]>([])
const inHand = ref<InHandPiece | null>(null)

const placedCount = computed(() => grid.value.length)
const canConfirm = computed(() => grid.value.length === 40)

export { pool, grid, inHand, placedCount, canConfirm }

export function usePlacement() {
  return { pool, grid, inHand, placedCount, canConfirm }
}

// ─── Build initial pool ──────────────────────────────────────

export function buildInitialPool(): PieceCount[] {
  const army = getArmy(1) // Player 1 = Romans
  const pieces: PieceCount[] = []
  for (const p of army.pieces) {
    pieces.push({
      key: p.key,
      name: p.name,
      rank: p.rank,
      emoji: p.emoji,
      remaining: p.count,
    })
  }
  return pieces
}

// ─── Deployment zone ─────────────────────────────────────────

function isDeploymentZone(r: number, _c: number): boolean {
  return r >= 6 && r <= 9
}

// ─── Pick a piece ────────────────────────────────────────────

export function pickFromPool(key: string) {
  const entry = pool.value.find(p => p.key === key)
  if (!entry || entry.remaining <= 0) return
  entry.remaining--
  inHand.value = { key, source: 'pool' }
}

export function pickFromGrid(r: number, c: number) {
  const idx = grid.value.findIndex(p => p.r === r && p.c === c)
  if (idx === -1) return
  const piece = grid.value[idx]
  grid.value.splice(idx, 1)
  inHand.value = { key: piece.piece, source: { r, c } }
}

// ─── Place / move / exchange ─────────────────────────────────

export function placeOnCell(r: number, c: number) {
  if (!inHand.value || !isDeploymentZone(r, c)) return

  const existingIdx = grid.value.findIndex(p => p.r === r && p.c === c)

  if (existingIdx !== -1) {
    // Cell occupied → EXCHANGE or CHANGE MIND
    if (inHand.value.source === 'pool') {
      // pool → grid, grid → pool
      const existing = grid.value[existingIdx]
      grid.value.splice(existingIdx, 1, {
        r, c,
        piece: inHand.value.key,
      })
      const entry = pool.value.find(p => p.key === existing.piece)
      if (entry) entry.remaining++
      inHand.value = null
    } else {
      // grid → occupied grid: change mind, pick the new piece
      returnToGridSource()
      pickFromGrid(r, c)
    }
  } else {
    // Empty cell → PLACE or MOVE
    grid.value.push({ r, c, piece: inHand.value.key })
    inHand.value = null
  }
}

// ─── Return to pool / grid source ────────────────────────────

export function returnToPool(r: number, c: number) {
  const idx = grid.value.findIndex(p => p.r === r && p.c === c)
  if (idx === -1) return
  const piece = grid.value[idx]
  grid.value.splice(idx, 1)
  const entry = pool.value.find(p => p.key === piece.piece)
  if (entry) entry.remaining++
}

export function returnToGridSource() {
  if (!inHand.value || inHand.value.source === 'pool') return
  const { r, c } = inHand.value.source
  grid.value.push({ r, c, piece: inHand.value.key })
  inHand.value = null
}

// ─── Clear all ───────────────────────────────────────────────

export function clearAll() {
  for (const piece of grid.value) {
    const entry = pool.value.find(p => p.key === piece.piece)
    if (entry) entry.remaining++
  }
  grid.value.length = 0
  inHand.value = null
}

// ─── Start / cancel placement phase ──────────────────────────

export function startPlacement(mode: PlacementMode = 'manual') {
  pool.value = buildInitialPool()
  grid.value = []
  inHand.value = null
  gameState.phase = 'placement'

  if (mode === 'random') {
    // Random mode: skip placement screen, start game directly
    startNewGame()
    gameState.phase = 'battle'
  }
}

export function cancelPlacement() {
  pool.value = []
  grid.value = []
  inHand.value = null
  gameState.phase = 'battle'
  gameState.gameId = null
  gameState.playerToken = null
  gameState.statusMessage = 'Cliquez sur « Nouvelle Partie » pour commencer.'
}

// ─── Confirm and send to backend ─────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function confirmPlacement() {
  const res = await fetch(`${API_BASE}/api/game/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      placement_mode: 'manual',
      manual_placement: grid.value.map(p => ({
        r: p.r,
        c: p.c,
        piece: p.piece,
      })),
    }),
  })
  const data = await res.json()

  if (data.error) {
    gameState.statusMessage = `Erreur de placement : ${data.error}`
    return
  }

  gameState.gameId = data.game_id
  gameState.playerToken = data.player_token
  gameState.currentTurn = data.current_turn || 1
  gameState.grid = data.state.grid
  gameState.gameOver = data.state.game_over
  gameState.winner = data.state.winner
  gameState.phase = 'battle'
  gameState.currentPlayer = 1
  gameState.selectedCell = null
  gameState.lastMove = null
  gameState.lastAIMove = null
  gameState.moveHistory = [{ type: 'game_start', gameId: data.game_id }]
  gameState.statusMessage = `Partie ${data.game_id} — À vous de jouer (⚔️ Romains).`
}
