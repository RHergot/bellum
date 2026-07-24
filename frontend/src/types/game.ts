// TypeScript interfaces for Bellum game

export interface Cell {
  player: number       // 0 = empty, 1 = Romans, 2 = Napoleon
  piece: string | null // piece key or null
  revealed: boolean
}

export interface GridState {
  grid: Cell[][]
  game_over: boolean
  winner: number | null
  current_turn: number
}

export interface Move {
  sr: number
  sc: number
  tr: number
  tc: number
  player: number
}

export interface PieceDef {
  key: string
  rank: number
  name: string
  short: string
  count: number
  emoji: string
}

export interface Army {
  name: string
  color: string
  accent: string
  pieces: PieceDef[]
}

export type DisplayMode = 'numbers' | 'colors' | 'lissajous'
export type GamePhase = 'placement' | 'battle'
export type AIMode = 'vs_ai' | 'vs_human'

export interface GameState {
  gameId: string | null
  phase: GamePhase
  currentPlayer: number
  currentTurn: number
  grid: Cell[][]
  selectedCell: { r: number; c: number } | null
  gameOver: boolean
  winner: number | null
  mode: AIMode
  displayMode: DisplayMode
  statusMessage: string
  remainingToPlace: Record<string, string[]>
}
