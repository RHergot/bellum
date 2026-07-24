import { ref, reactive } from 'vue'
import type { Cell, GridState, GamePhase, AIMode, DisplayMode } from '../types/game'
import { getArmy, isMobile } from '../data/armies'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Shared reactive state
export const gameState = reactive({
  gameId: null as string | null,
  phase: 'placement' as GamePhase,
  currentPlayer: 1,
  currentTurn: 1,
  grid: [] as Cell[][],
  selectedCell: null as { r: number; c: number } | null,
  gameOver: false,
  winner: null as number | null,
  mode: 'vs_ai' as AIMode,
  displayMode: 'numbers' as DisplayMode,
  statusMessage: 'Cliquez sur "Nouvelle Partie" pour commencer.',
  remainingToPlace: {} as Record<string, string[]>,
  myPlayer: 1, // which player am I? (for multi-screen: 1 or 2)
})

function emptyGrid(): Cell[][] {
  const g: Cell[][] = []
  for (let r = 0; r < 10; r++) {
    g[r] = []
    for (let c = 0; c < 10; c++) {
      g[r][c] = { player: 0, piece: null, revealed: false }
    }
  }
  return g
}

export async function startNewGame() {
  try {
    const res = await fetch(`${API_BASE}/api/game/new/`, { method: 'POST' })
    const data = await res.json()
    if (data.error) {
      gameState.statusMessage = `Erreur : ${data.error}`
      return
    }
    gameState.gameId = data.game_id
    gameState.currentTurn = data.current_turn || 1
    gameState.grid = data.state.grid
    gameState.gameOver = data.state.game_over
    gameState.winner = data.state.winner
    gameState.phase = 'battle'
    gameState.currentPlayer = 1
    gameState.selectedCell = null
    gameState.statusMessage = `Partie ${data.game_id} lancée ! ${gameState.mode === 'vs_ai' ? 'À vous de jouer (⚔️ Romains).' : '⚔️ Romains commence.'}`
  } catch (err) {
    gameState.statusMessage = 'Erreur de connexion au backend.'
    console.error(err)
  }
}

export async function fetchState() {
  if (!gameState.gameId) return
  try {
    const res = await fetch(`${API_BASE}/api/game/${gameState.gameId}/state/?player=${gameState.myPlayer}`)
    const data = await res.json()
    if (data.error) return
    gameState.grid = data.grid
    gameState.gameOver = data.game_over
    gameState.winner = data.winner
    gameState.currentTurn = data.current_turn || 1
  } catch (err) {
    console.error('fetchState error:', err)
  }
}

export async function makeMove(sr: number, sc: number, tr: number, tc: number) {
  if (!gameState.gameId || gameState.gameOver) return
  console.log('[DEBUG] makeMove gameId:', gameState.gameId, 'move:', sr, sc, '→', tr, tc)

  try {
    const url = `${API_BASE}/api/game/${gameState.gameId}/move/`
    console.log('[DEBUG] POST', url)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sr, sc, tr, tc, player: gameState.myPlayer })
    })
    const data = await res.json()
    if (data.error) {
      gameState.statusMessage = `Erreur : ${data.error}`
      return
    }

    gameState.grid = data.state.grid
    gameState.gameOver = data.state.game_over
    gameState.winner = data.state.winner
    gameState.currentTurn = data.current_turn || 1

    if (gameState.gameOver) {
      const wname = gameState.winner === 1 ? '⚔️ Romains' : '🎩 Napoléon'
      gameState.statusMessage = `🏆 Victoire — ${wname} !`
    } else {
      gameState.statusMessage = 'Coup joué. À vous !'
    }
  } catch (err) {
    gameState.statusMessage = "Erreur lors de l'envoi du coup."
    console.error(err)
  }
}

export function handleCellClick(r: number, c: number) {
  if (gameState.gameOver || !gameState.gameId) return
  if (gameState.currentTurn !== gameState.myPlayer) {
    gameState.statusMessage = "Ce n'est pas votre tour."
    return
  }

  if (!gameState.selectedCell) {
    // Select piece
    const cell = gameState.grid[r]?.[c]
    if (cell && cell.player === gameState.myPlayer && isMobile(cell.piece)) {
      gameState.selectedCell = { r, c }
      gameState.statusMessage = `Pièce sélectionnée en (${r}, ${c}). Choisissez la destination.`
    }
  } else {
    const sr = gameState.selectedCell.r
    const sc = gameState.selectedCell.c
    gameState.selectedCell = null

    // Click same cell = deselect
    if (sr === r && sc === c) return

    // Click own piece = reselect
    const dstCell = gameState.grid[r]?.[c]
    if (dstCell && dstCell.player === gameState.myPlayer) {
      gameState.selectedCell = { r, c }
      gameState.statusMessage = `Pièce sélectionnée en (${r}, ${c}). Choisissez la destination.`
      return
    }

    makeMove(sr, sc, r, c)
  }
}
