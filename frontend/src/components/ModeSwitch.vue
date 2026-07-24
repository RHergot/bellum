<script setup lang="ts">
import { gameState } from '../composables/useGame'
import type { DisplayMode } from '../types/game'

const modes: { key: DisplayMode; label: string; emoji: string }[] = [
  { key: 'numbers', label: 'Chiffres', emoji: '🔢' },
  { key: 'colors', label: 'Couleurs', emoji: '🎨' },
  { key: 'lissajous', label: 'Ondes', emoji: '📡' },
]

function setMode(mode: DisplayMode) {
  gameState.displayMode = mode
}
</script>

<template>
  <div class="mode-switch">
    <button
      v-for="m in modes"
      :key="m.key"
      class="mode-btn"
      :class="{ active: gameState.displayMode === m.key }"
      @click="setMode(m.key)"
    >
      {{ m.emoji }} {{ m.label }}
    </button>
  </div>
</template>

<style scoped>
.mode-switch { display: flex; gap: 3px; }
.mode-btn {
  flex: 1; padding: 5px 2px; font-size: 0.8rem;
  border: 1px solid #30363d; background: #21262d; border-radius: 4px;
  cursor: pointer; color: #c9d1d9;
}
.mode-btn.active { background: #1f6feb; border-color: #58a6ff; }
</style>
