<script setup lang="ts">
import { ref } from 'vue'
import GameCanvas from './components/GameCanvas.vue'
import Sidebar from './components/Sidebar.vue'
import ModeSwitch from './components/ModeSwitch.vue'
import RulesModal from './components/RulesModal.vue'
import { gameState, startNewGame } from './composables/useGame'

const rulesModalRef = ref<InstanceType<typeof RulesModal> | null>(null)
</script>

<template>
  <div class="p-4 max-w-[1100px] mx-auto">
    <!-- Header -->
    <header class="flex justify-between items-center mb-3 border-b border-[#30363d] pb-2">
      <div>
        <h1 class="text-xl font-black bg-gradient-to-r from-[#f85149] via-[#f0883e] to-[#d29922] text-transparent bg-clip-text">
          ⚔️ Bellum
        </h1>
        <p class="text-xs text-[#8b949e]">Romains · Napoléon — Morne plaine de Waterloo</p>
      </div>
      <span class="text-xs text-[#8b949e]">{{ gameState.statusMessage }}</span>
    </header>

    <!-- 3-column layout -->
    <div class="flex gap-2 items-start justify-center">
      <!-- Left sidebar -->
      <Sidebar side="left" :player="1" />

      <!-- Center: canvas + controls -->
      <div class="flex-shrink-0">
        <GameCanvas />

        <!-- Controls bar -->
        <div class="mt-2 flex flex-col gap-1.5 max-w-[600px]">
          <ModeSwitch />

          <div class="flex gap-1">
            <button
              class="flex-1 bg-[#238636] border border-[#2ea043] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#2ea043] cursor-pointer"
              @click="startNewGame"
            >
              🔄 Nouvelle Partie
            </button>
            <button
              class="flex-1 bg-[#21262d] border border-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#30363d] cursor-pointer"
              @click="rulesModalRef?.open()"
            >
              📖 Règles
            </button>
          </div>
        </div>
      </div>

      <!-- Right sidebar -->
      <Sidebar side="right" :player="2" />
    </div>

    <!-- Rules modal -->
    <RulesModal ref="rulesModalRef" />
  </div>
</template>

<style>
body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
</style>
