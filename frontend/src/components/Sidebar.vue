<script setup lang="ts">
import { computed } from 'vue'
import { gameState } from '../composables/useGame'
import { getArmy, TILE_COLORS } from '../data/armies'
import type { Army } from '../types/game'

const props = defineProps<{
  side: 'left' | 'right'
  player: number
}>()

const army = computed<Army>(() => getArmy(props.player))

// Count alive pieces for the opponent (what this sidebar player has captured)
const capturedPieces = computed(() => {
  const opponent = 3 - props.player
  const oppArmy = getArmy(opponent)
  const result: { key: string; emoji: string; alive: boolean }[] = []

  // Count alive pieces on board
  const aliveCount: Record<string, number> = {}
  oppArmy.pieces.forEach(p => { aliveCount[p.key] = 0 })
  for (const row of gameState.grid) {
    for (const cell of row) {
      if (cell.player === opponent && cell.piece) {
        aliveCount[cell.piece] = (aliveCount[cell.piece] || 0) + 1
      }
    }
  }

  // Build the full roster with alive/taken status
  const consumed: Record<string, number> = {}
  oppArmy.pieces.forEach(p => { consumed[p.key] = 0 })
  oppArmy.pieces.forEach(p => {
    for (let i = 0; i < p.count; i++) {
      consumed[p.key] = (consumed[p.key] || 0) + 1
      const isAlive = consumed[p.key] <= (aliveCount[p.key] || 0)
      result.push({ key: p.key, emoji: p.emoji, alive: isAlive })
    }
  })
  return result
})
</script>

<template>
  <div class="sidebar" :class="side">
    <div class="sidebar-content open">
      <h3>{{ side === 'left' ? '⚔️' : '🎩' }} {{ army.name }}</h3>

      <!-- Reference table -->
      <h4>📋 Grades</h4>
      <div class="ref-table">
        <div v-for="p in army.pieces" :key="p.key" class="ref-row">
          <span class="ref-rank" :class="p.rank >= 10 ? 'high' : p.rank >= 7 ? 'med' : 'low'">
            {{ p.rank >= 0 ? p.rank : '💣' }}
          </span>
          <span class="ref-name" :title="p.name">{{ p.name }}</span>
          <span class="ref-count">×{{ p.count }}</span>
          <span class="ref-sample" :style="{ background: TILE_COLORS[p.key] || '#555', border: '1px solid ' + army.accent }">
            {{ p.emoji }}
          </span>
        </div>
      </div>

      <!-- Captured pieces -->
      <h4>🎯 Pièces adverses prises</h4>
      <div class="captured-grid">
        <div
          v-for="(cp, i) in capturedPieces"
          :key="i"
          class="captured-cell"
          :class="cp.alive ? 'alive' : 'taken'"
          :title="cp.alive ? 'En vie' : 'Prise !'"
        >
          {{ cp.emoji }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  min-width: 160px;
  max-width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.sidebar-content {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sidebar-content h3 {
  font-size: 0.85rem;
  text-align: center;
  margin: 0;
}
.left .sidebar-content h3  { color: #f0883e; }
.right .sidebar-content h3 { color: #58a6ff; }
.sidebar-content h4 {
  font-size: 0.65rem;
  color: #8b949e;
  font-weight: 600;
  margin: 0 0 2px 0;
}
.ref-table { display: flex; flex-direction: column; gap: 2px; }
.ref-row {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 5px; background: #0d1117; border-radius: 4px; font-size: 0.6rem;
}
.ref-rank { width: 18px; text-align: center; font-weight: bold; font-size: 0.7rem; }
.ref-rank.high { color: #FFD700; }
.ref-rank.med  { color: #f0883e; }
.ref-rank.low  { color: #8b949e; }
.ref-name {
  flex: 1; font-size: 0.62rem; color: #c9d1d9;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ref-count { width: 16px; text-align: center; color: #8b949e; font-size: 0.55rem; }
.ref-sample {
  width: 20px; height: 20px; border-radius: 3px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 0.7rem;
}
.captured-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
.captured-cell {
  aspect-ratio: 1; border-radius: 4px; font-size: 0.75rem;
  display: flex; align-items: center; justify-content: center;
  min-width: 20px; border: 2px solid transparent;
}
.captured-cell.alive { background: rgba(196,30,58,0.25); border-color: #C41E3A; }
.captured-cell.taken { background: rgba(35,134,54,0.2); border-color: #238636; }
</style>
