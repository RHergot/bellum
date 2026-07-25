import { reactive } from 'vue'
import type { Cell, GamePhase, AIMode, DisplayMode, MoveHistoryEntry } from '../types/game'
import { getArmy, isMobile } from '../data/armies'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Shared reactive state
export const gameState = reactive({
  gameId: null as string | null,
  playerToken: null as string | null,
  phase: 'battle' as GamePhase,
  currentPlayer: 1,
  currentTurn: 1,
  grid: [] as Cell[][],
  selectedCell: null as { r: number; c: number } | null,
  gameOver: false,
  winner: null as number | null,
  mode: 'vs_ai' as AIMode,
  displayMode: 'numbers' as DisplayMode,
  statusMessage: 'Cliquez sur « Nouvelle Partie » pour commencer.',
  remainingToPlace: {} as Record<string, string[]>,
  myPlayer: 1,
  moveHistory: [] as MoveHistoryEntry[],
})

export async function startNewGame() {
  try {
    const res = await fetch(`${API_BASE}/api/game/new/`, { method: 'POST' })
    const data = await res.json()
    if (data.error) {
      gameState.statusMessage = `Erreur : ${data.error}`
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
    gameState.moveHistory = [{ type: 'game_start', gameId: data.game_id }]
    gameState.statusMessage = `Partie ${data.game_id} — À vous de jouer (⚔️ Romains).`
  } catch (err) {
    gameState.statusMessage = 'Erreur de connexion au backend.'
    console.error(err)
  }
}

export async function fetchState() {
  if (!gameState.gameId || !gameState.playerToken) return
  try {
    const res = await fetch(
      `${API_BASE}/api/game/${gameState.gameId}/state/?player_token=${encodeURIComponent(gameState.playerToken)}`
    )
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
  if (!gameState.gameId || !gameState.playerToken || gameState.gameOver) return

  try {
    const res = await fetch(`${API_BASE}/api/game/${gameState.gameId}/move/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sr, sc, tr, tc,
        player_token: gameState.playerToken
      })
    })
    const data = await res.json()
    if (data.error) {
      const msg = data.error
      gameState.moveHistory.push({ type: 'error', message: msg, sr, sc, tr, tc })
      // Friendlier messages for immobile pieces
      if (msg.includes('cannot move')) {
        gameState.statusMessage = `⛔ Cette pièce ne peut pas se déplacer (${msg}).`
      } else if (msg.includes('Not your turn')) {
        gameState.statusMessage = '⏳ Ce n\'est pas votre tour.'
      } else {
        gameState.statusMessage = `⚠️ ${msg}`
      }
      return
    }

    // Log successful move
    const srcCell = gameState.grid[sr]?.[sc]
    const dstCell = gameState.grid[tr]?.[tc]
    gameState.moveHistory.push({
      type: 'move',
      sr, sc, tr, tc,
      attacker: srcCell?.piece || undefined,
      defender: dstCell?.piece || undefined,
      result: dstCell?.player === 0 ? 'move' :
              data.state.game_over && data.state.winner === gameState.myPlayer ? 'attacker_win' :
              'combat'
    })

    gameState.grid = data.state.grid
    gameState.gameOver = data.state.game_over
    gameState.winner = data.state.winner
    gameState.currentTurn = data.current_turn || 1

    // Log AI move if present
    if (data.ai_move) {
      const [aiSrc, aiDst] = data.ai_move
      gameState.moveHistory.push({ type: 'ai_move', sr: aiSrc[0], sc: aiSrc[1], tr: aiDst[0], tc: aiDst[1] })
    }

    if (gameState.gameOver) {
      const wname = gameState.winner === 1 ? '⚔️ Romains' : '🎩 Napoléon'
      gameState.moveHistory.push({ type: 'game_over', message: `Victoire — ${wname}` })
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
    gameState.statusMessage = "⏳ Ce n'est pas votre tour."
    return
  }

  if (!gameState.selectedCell) {
    const cell = gameState.grid[r]?.[c]
    if (cell && cell.player === gameState.myPlayer) {
      if (!isMobile(cell.piece)) {
        const army = getArmy(gameState.myPlayer)
        const piece = army.pieces.find(p => p.key === cell.piece)
        const name = piece?.name || cell.piece
        gameState.statusMessage = `⛔ ${name} ne peut pas se déplacer.`
        return
      }
      gameState.selectedCell = { r, c }
      gameState.moveHistory.push({ type: 'select', sr: r, sc: c })
      gameState.statusMessage = `Pièce sélectionnée en (${r}, ${c}). Choisissez la destination.`
    }
  } else {
    const sr = gameState.selectedCell.r
    const sc = gameState.selectedCell.c
    gameState.selectedCell = null

    if (sr === r && sc === c) return

    const dstCell = gameState.grid[r]?.[c]
    if (dstCell && dstCell.player === gameState.myPlayer) {
      gameState.selectedCell = { r, c }
      gameState.moveHistory.push({ type: 'select', sr: r, sc: c })
      gameState.statusMessage = `Pièce sélectionnée en (${r}, ${c}). Choisissez la destination.`
      return
    }

    makeMove(sr, sc, r, c)
  }
}
