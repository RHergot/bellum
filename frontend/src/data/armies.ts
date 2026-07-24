import type { Army } from '../types/game'

export const ROMANS: Army = {
  name: 'Romains',
  color: '#C41E3A',
  accent: '#FFD700',
  pieces: [
    { key: 'marshal',    rank: 10, name: 'Legatus',         short: 'LEG', count: 1,  emoji: '🏛️' },
    { key: 'general',    rank: 9,  name: 'Tribunus Lat.',   short: 'TRI', count: 1,  emoji: '⚜️' },
    { key: 'colonel',    rank: 8,  name: 'Praefectus',      short: 'PRA', count: 2,  emoji: '🛡️' },
    { key: 'major',      rank: 7,  name: 'Tribunus Ang.',   short: 'ANG', count: 3,  emoji: '⚔️' },
    { key: 'captain',    rank: 6,  name: 'Primus Pilus',    short: 'PIL', count: 4,  emoji: '🗡️' },
    { key: 'lieutenant', rank: 5,  name: 'Centurio',        short: 'CEN', count: 4,  emoji: '🪖' },
    { key: 'sergeant',   rank: 4,  name: 'Optio',           short: 'OPT', count: 4,  emoji: '🏹' },
    { key: 'miner',      rank: 3,  name: 'Aquilifer',       short: 'AQU', count: 5,  emoji: '🦅' },
    { key: 'scout',      rank: 2,  name: 'Speculator',      short: 'SPE', count: 8,  emoji: '🐴' },
    { key: 'spy',        rank: 1,  name: 'Explorator',      short: 'EXP', count: 1,  emoji: '🕵️' },
    { key: 'flag',       rank: 0,  name: 'Vexillum',        short: 'VEX', count: 1,  emoji: '🚩' },
    { key: 'bomb',       rank: -1, name: 'Stimulus',        short: 'STI', count: 6,  emoji: '💣' },
  ]
}

export const NAPOLEON: Army = {
  name: 'Napoléon',
  color: '#1B3A5C',
  accent: '#D4AF37',
  pieces: [
    { key: 'marshal',    rank: 10, name: 'Maréchal',        short: 'MAR', count: 1,  emoji: '🎩' },
    { key: 'general',    rank: 9,  name: 'Général Div.',    short: 'GDV', count: 1,  emoji: '⭐' },
    { key: 'colonel',    rank: 8,  name: 'Général Brg.',    short: 'GBR', count: 2,  emoji: '🎖️' },
    { key: 'major',      rank: 7,  name: 'Colonel',         short: 'COL', count: 3,  emoji: '🪖' },
    { key: 'captain',    rank: 6,  name: 'Chef Bat.',       short: 'CBA', count: 4,  emoji: '⚔️' },
    { key: 'lieutenant', rank: 5,  name: 'Capitaine',       short: 'CAP', count: 4,  emoji: '🛡️' },
    { key: 'sergeant',   rank: 4,  name: 'Lieutenant',      short: 'LTN', count: 4,  emoji: '🗡️' },
    { key: 'miner',      rank: 3,  name: 'Sapeur',          short: 'SAP', count: 5,  emoji: '⛏️' },
    { key: 'scout',      rank: 2,  name: 'Éclaireur',       short: 'ECL', count: 8,  emoji: '🐎' },
    { key: 'spy',        rank: 1,  name: 'Agent secret',    short: 'AGT', count: 1,  emoji: '🕵️' },
    { key: 'flag',       rank: 0,  name: 'Aigle impérial',  short: 'AIG', count: 1,  emoji: '🦅' },
    { key: 'bomb',       rank: -1, name: 'Mine',            short: 'MIN', count: 6,  emoji: '💣' },
  ]
}

export const TILE_COLORS: Record<string, string> = {
  marshal: '#FF0000', general: '#FF4500', colonel: '#FF8C00', major: '#FFD700',
  captain: '#32CD32', lieutenant: '#228B22', sergeant: '#4682B4',
  miner: '#8A2BE2', scout: '#00CED1', spy: '#FF69B4', flag: '#FFFFFF', bomb: '#333333'
}

export function getArmy(player: number): Army {
  return player === 1 ? ROMANS : NAPOLEON
}

export function getRank(army: Army, pieceKey: string): number {
  const p = army.pieces.find(p => p.key === pieceKey)
  return p ? p.rank : 0
}

export function getPiece(army: Army, pieceKey: string) {
  return army.pieces.find(p => p.key === pieceKey) || null
}

export function isMobile(pieceKey: string | null): boolean {
  return pieceKey !== 'flag' && pieceKey !== 'bomb' && pieceKey !== null
}
