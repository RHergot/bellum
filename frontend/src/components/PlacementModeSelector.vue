<script setup lang="ts">
import type { PlacementMode } from '../types/game'

const emit = defineEmits<{
  select: [mode: PlacementMode]
}>()
</script>

<template>
  <div class="placement-mode-selector">
    <h2>🧩 Choisissez le mode de placement</h2>
    <div class="mode-buttons">
      <button class="mode-btn random" @click="emit('select', 'random')">
        <span class="mode-emoji">🎲</span>
        <span class="mode-label">Aléatoire</span>
        <span class="mode-desc">Placement automatique</span>
      </button>
      <button class="mode-btn manual" @click="emit('select', 'manual')">
        <span class="mode-emoji">🧩</span>
        <span class="mode-label">Manuel</span>
        <span class="mode-desc">Placez vos pièces une à une</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.placement-mode-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}
.placement-mode-selector h2 {
  color: #c9d1d9;
  font-size: 1.1rem;
}
.mode-buttons {
  display: flex;
  gap: 12px;
}
.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 32px;
  border: 2px solid #30363d;
  border-radius: 8px;
  background: #21262d;
  color: #c9d1d9;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 160px;
}
.mode-btn:hover {
  border-color: #58a6ff;
  background: #1f2a38;
}
.mode-btn.random:hover {
  border-color: #3fb950;
}
.mode-btn.manual:hover {
  border-color: #f0883e;
}
.mode-emoji {
  font-size: 2rem;
}
.mode-label {
  font-size: 1rem;
  font-weight: 600;
}
.mode-desc {
  font-size: 0.7rem;
  color: #8b949e;
}
</style>
