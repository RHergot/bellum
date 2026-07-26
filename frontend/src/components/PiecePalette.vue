<script setup lang="ts">
import type { PieceCount, InHandPiece } from '../types/game'

defineProps<{
  pool: PieceCount[]
  inHand: InHandPiece | null
}>()

const emit = defineEmits<{
  pick: [key: string]
}>()
</script>

<template>
  <div class="piece-palette">
    <h3>Pièces disponibles</h3>
    <div class="palette-list">
      <button
        v-for="p in pool"
        :key="p.key"
        class="palette-item"
        :class="{
          'is-empty': p.remaining === 0,
          'is-in-hand': inHand?.key === p.key,
        }"
        :disabled="p.remaining === 0"
        @click="emit('pick', p.key)"
      >
        <span class="piece-emoji">{{ p.emoji }}</span>
        <span class="piece-name">{{ p.name }}</span>
        <span class="piece-count">×{{ p.remaining }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.piece-palette {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
  max-width: 240px;
}
.piece-palette h3 {
  color: #8b949e;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 2px;
}
.palette-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid #30363d;
  border-radius: 4px;
  background: #161b22;
  color: #c9d1d9;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.1s;
}
.palette-item:hover:not(.is-empty):not(:disabled) {
  background: #1f2a38;
  border-color: #58a6ff;
}
.palette-item.is-empty {
  opacity: 0.3;
  cursor: default;
}
.palette-item.is-in-hand {
  background: #1f6feb33;
  border-color: #58a6ff;
  box-shadow: 0 0 6px #1f6feb66;
}
.piece-emoji {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
}
.piece-name {
  flex: 1;
  font-size: 0.75rem;
}
.piece-count {
  color: #8b949e;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 20px;
  text-align: right;
}
</style>
