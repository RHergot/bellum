<script setup lang="ts">
import { computed, ref, nextTick, watch } from 'vue'
import { gameState } from '../composables/useGame'
import { getArmy, getPiece } from '../data/armies'

const logContainer = ref<HTMLDivElement | null>(null)

// Auto-scroll to bottom when new entries appear
watch(() => gameState.moveHistory.length, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

function formatMove(entry: typeof gameState.moveHistory[0]): string {
  const t = entry.type
  if (t === 'game_start') return `🎮 Partie ${entry.gameId}`
  if (t === 'select') return `👆 Sélection (${entry.sr},${entry.sc})`
  if (t === 'move') {
    const p1 = getArmy(1)
    const attacker = getPiece(p1, entry.attacker || '')
    const aName = attacker?.name || entry.attacker || '?'
    const action = entry.result === 'attacker_win' ? '💥 Capture' :
                   entry.result === 'both_destroy' ? '💀 Échange' :
                   entry.result === 'defender_win' ? '🛡️ Défense' : '➡️ Déplacement'
    return `${action} ${aName} (${entry.sr},${entry.sc})→(${entry.tr},${entry.tc})`
  }
  if (t === 'ai_move') return `🤖 IA joue (${entry.sr},${entry.sc})→(${entry.tr},${entry.tc})`
  if (t === 'error') return `⚠️ ${entry.message}`
  if (t === 'game_over') return `🏆 ${entry.message}`
  return ''
}

function entryClass(entry: typeof gameState.moveHistory[0]): string {
  if (entry.type === 'error') return 'text-red-400'
  if (entry.type === 'ai_move') return 'text-blue-400'
  if (entry.type === 'game_over') return 'text-yellow-400 font-bold'
  if (entry.type === 'game_start') return 'text-green-400'
  return 'text-gray-300'
}
</script>

<template>
  <div v-if="gameState.moveHistory.length > 0" class="move-log">
    <div class="log-header">📜 Historique</div>
    <div ref="logContainer" class="log-entries">
      <div
        v-for="(entry, i) in gameState.moveHistory"
        :key="i"
        class="log-entry"
        :class="entryClass(entry)"
      >
        <span class="log-num">{{ i + 1 }}.</span>
        {{ formatMove(entry) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.move-log {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  margin-top: 8px;
  max-width: 600px;
  overflow: hidden;
}
.log-header {
  font-size: 0.65rem;
  font-weight: 600;
  color: #8b949e;
  padding: 6px 10px;
  border-bottom: 1px solid #30363d;
  background: #0d1117;
}
.log-entries {
  max-height: 140px;
  overflow-y: auto;
  padding: 4px 0;
  font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
}
.log-entry {
  font-size: 0.6rem;
  padding: 2px 10px;
  line-height: 1.4;
}
.log-num {
  color: #484f58;
  margin-right: 4px;
}
</style>
