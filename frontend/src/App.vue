<script setup lang="ts">
import { ref } from 'vue'
import GameCanvas from './components/GameCanvas.vue'
import Sidebar from './components/Sidebar.vue'
import ModeSwitch from './components/ModeSwitch.vue'
import RulesModal from './components/RulesModal.vue'
import MoveLog from './components/MoveLog.vue'
import { gameState, startNewGame } from './composables/useGame'

const rulesModalRef = ref<InstanceType<typeof RulesModal> | null>(null)
</script>

<template>
  <div class="app-container">
    <header>
      <div>
        <h1>⚔️ Bellum</h1>
        <p class="subtitle">Romains · Napoléon — Morne plaine de Waterloo</p>
      </div>
      <span class="status">{{ gameState.statusMessage }}</span>
    </header>

    <div class="layout">
      <Sidebar side="left" :player="1" />
      <div class="board-area">
        <GameCanvas />
        <div class="controls-bar">
          <ModeSwitch />
          <div class="btn-bar">
            <button class="btn primary" @click="startNewGame">🔄 Nouvelle Partie</button>
            <button class="btn" @click="rulesModalRef?.open()">📖 Règles</button>
          </div>
        </div>

        <MoveLog />
      </div>
      <Sidebar side="right" :player="2" />
    </div>

    <RulesModal ref="rulesModalRef" />
  </div>
</template>

<style>
/* ===== GLOBAL RESET & BODY ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  min-height: 100vh;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* ===== APP CONTAINER ===== */
.app-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
}

/* ===== HEADER ===== */
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1100px;
  border-bottom: 1px solid #30363d;
  padding-bottom: 6px;
  margin-bottom: 8px;
}
header h1 {
  font-size: 1.4rem;
  background: linear-gradient(90deg, #f85149, #f0883e, #d29922);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle { font-size: 0.72rem; color: #8b949e; }
.status { font-size: 0.7rem; color: #8b949e; max-width: 300px; text-align: right; }

/* ===== 3-COLUMN LAYOUT ===== */
.layout {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: center;
  max-width: 1100px;
  width: 100%;
}
.board-area {
  flex-shrink: 0;
}

/* ===== CANVAS ===== */
canvas {
  border: 2px solid #30363d;
  border-radius: 6px;
  display: block;
  touch-action: manipulation;
  cursor: pointer;
}

/* ===== CONTROLS BAR ===== */
.controls-bar {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 600px;
}
.btn-bar {
  display: flex;
  gap: 4px;
}

/* ===== BUTTONS ===== */
.btn {
  background: #21262d;
  border: 1px solid #30363d;
  color: #c9d1d9;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.65rem;
  font-weight: 600;
  text-align: center;
  width: 100%;
}
.btn:hover { background: #30363d; }
.btn.primary { background: #238636; border-color: #2ea043; color: #fff; }
.btn.primary:hover { background: #2ea043; }

/* ===== RESPONSIVE ===== */
@media (max-width: 1000px) {
  .sidebar { min-width: 0; max-width: 140px; }
}
@media (max-width: 780px) {
  .layout { flex-direction: column; align-items: center; }
}
</style>
