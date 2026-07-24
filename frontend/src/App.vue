<script setup lang="ts">
import { ref, onMounted } from 'vue'

const gameId = ref<string | null>(null)
const gridP1 = ref<any[][]>([])
const gridP2 = ref<any[][]>([])
const statusMessage = ref('Cliquez sur "Nouvelle Partie" pour commencer.')
const selectedCell = ref<{r: number, c: number} | null>(null)
const gameOver = ref(false)
const winner = ref<number | null>(null)

const startNewGame = async () => {
  try {
    const res = await fetch('http://localhost:8000/api/game/new/', { method: 'POST' })
    const data = await res.json()
    gameId.value = data.game_id
    gridP1.value = data.state.grid
    // For P2 perspective view (spectator/AI view)
    const resP2 = await fetch(`http://localhost:8000/api/game/${gameId.value}/state/?player=2`)
    const dataP2 = await resP2.json()
    gridP2.value = dataP2.grid
    statusMessage.value = `Partie ${gameId.value} lancée ! À vous de jouer (Joueur 1).`
    selectedCell.value = null
    gameOver.value = data.state.game_over
    winner.value = data.state.winner
  } catch (err) {
    statusMessage.value = 'Erreur de connexion au backend Django.'
    console.error(err)
  }
}

const handleCellClick = async (r: number, c: number) => {
  if (gameOver.value || !gameId.value) return

  if (!selectedCell.value) {
    // Select piece
    if (gridP1.value[r][c].player === 1) {
      selectedCell.value = { r, c }
      statusMessage.value = `Pièce sélectionnée en (${r}, ${c}). Choisissez la case de destination.`
    }
  } else {
    // Make move
    const sr = selectedCell.value.r
    const sc = selectedCell.value.c
    const tr = r
    const tc = c

    selectedCell.value = null

    try {
      const res = await fetch(`http://localhost:8000/api/game/${gameId.value}/move/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sr, sc, tr, tc })
      })
      const data = await res.json()
      if (data.error) {
        statusMessage.value = `Erreur : ${data.error}`
        return
      }

      gridP1.value = data.state.grid
      gameOver.value = data.state.game_over
      winner.value = data.state.winner

      // Refresh P2 perspective
      const resP2 = await fetch(`http://localhost:8000/api/game/${gameId.value}/state/?player=2`)
      const dataP2 = await resP2.json()
      gridP2.value = dataP2.grid

      if (gameOver.value) {
        statusMessage.value = `Partie terminée ! Vainqueur : Joueur ${winner.value}`
      } else {
        statusMessage.value = data.ai_move ? `Coup IA joué en (${data.ai_move[1][0]}, ${data.ai_move[1][1]}). À vous !` : 'Coup joué. À vous !'
      }
    } catch (err) {
      statusMessage.value = 'Erreur lors de l\'envoi du coup.'
      console.error(err)
    }
  }
}

const getCellColor = (cell: any, playerPerspective: number) => {
  if (cell.player === 0) return 'bg-gray-800 hover:bg-gray-700 border-gray-700'
  if (cell.player === playerPerspective) {
    return 'bg-blue-900 border-blue-600 text-blue-200 font-bold'
  } else {
    return cell.revealed ? 'bg-red-900 border-red-600 text-red-200 font-bold' : 'bg-red-950 border-red-800 text-red-400'
  }
}

const getCellLabel = (cell: any, playerPerspective: number) => {
  if (cell.player === 0) return ''
  if (cell.player === playerPerspective || cell.revealed) {
    return cell.piece ? cell.piece.substring(0, 3).toUpperCase() : '?'
  }
  return '🛡️'
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <header class="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
      <div>
        <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
          ⚔️ Bellum — Romains vs Napoléon & IA ISMCTS
        </h1>
        <p class="text-gray-400 text-sm mt-1">{{ statusMessage }}</p>
      </div>
      <button 
        @click="startNewGame" 
        class="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg transition-all">
        🔄 Nouvelle Partie
      </button>
    </header>

    <!-- SPLIT-SCREEN LAYOUT : 2 distinct parts for 2 players / dual perspective -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Pane 1 : Player 1 Perspective -->
      <div class="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-blue-400">🛡️ Perspective Joueur 1 (Votre Armée)</h2>
          <span class="text-xs bg-blue-950 text-blue-300 px-3 py-1 rounded-full border border-blue-800">Actif</span>
        </div>
        <div class="grid grid-cols-10 gap-1.5 bg-gray-950 p-3 rounded-xl border border-gray-800">
          <template v-for="(row, r) in gridP1" :key="r">
            <div 
              v-for="(cell, c) in row" 
              :key="c"
              @click="handleCellClick(r, c)"
              :class="[
                'aspect-square flex flex-col items-center justify-center text-xs rounded border transition-all cursor-pointer select-none',
                getCellColor(cell, 1),
                selectedCell?.r === r && selectedCell?.c === c ? 'ring-2 ring-yellow-400 scale-105 z-10' : ''
              ]">
              <span class="truncate px-0.5">{{ getCellLabel(cell, 1) }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Pane 2 : Player 2 / AI Perspective (Split Screen Second View) -->
      <div class="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-2xl">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-red-400">🤖 Perspective Joueur 2 / IA (ISMCTS)</h2>
          <span class="text-xs bg-red-950 text-red-300 px-3 py-1 rounded-full border border-red-800">Adversaire</span>
        </div>
        <div class="grid grid-cols-10 gap-1.5 bg-gray-950 p-3 rounded-xl border border-gray-800">
          <template v-for="(row, r) in gridP2" :key="r">
            <div 
              v-for="(cell, c) in row" 
              :key="c"
              :class="[
                'aspect-square flex flex-col items-center justify-center text-xs rounded border transition-all select-none opacity-90',
                getCellColor(cell, 2)
              ]">
              <span class="truncate px-0.5">{{ getCellLabel(cell, 2) }}</span>
            </div>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>
