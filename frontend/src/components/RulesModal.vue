<script setup lang="ts">
import { ref } from 'vue'
import { ROMANS, NAPOLEON } from '../data/armies'

const show = ref(false)

const rules = [
  { rank: 10, roman: 'Legatus', napoleon: 'Maréchal', count: 1 },
  { rank: 9,  roman: 'Tribunus Lat.', napoleon: 'Général Div.', count: 1 },
  { rank: 8,  roman: 'Praefectus', napoleon: 'Général Brg.', count: 2 },
  { rank: 7,  roman: 'Tribunus Ang.', napoleon: 'Colonel', count: 3 },
  { rank: 6,  roman: 'Primus Pilus', napoleon: 'Chef Bat.', count: 4 },
  { rank: 5,  roman: 'Centurio', napoleon: 'Capitaine', count: 4 },
  { rank: 4,  roman: 'Optio', napoleon: 'Lieutenant', count: 4 },
  { rank: 3,  roman: 'Aquilifer', napoleon: 'Sapeur', count: 5 },
  { rank: 2,  roman: 'Speculator', napoleon: 'Éclaireur', count: 8 },
  { rank: 1,  roman: 'Explorator', napoleon: 'Agent secret', count: 1 },
  { rank: 0,  roman: 'Vexillum', napoleon: 'Aigle impérial', count: 1 },
  { rank: -1, roman: 'Stimulus', napoleon: 'Mine', count: 6 },
]

defineExpose({ show, open: () => show.value = true, close: () => show.value = false })
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="show = false">
      <div class="modal">
        <button class="modal-close" @click="show = false">✕</button>
        <h2>📖 Bellum — Règles</h2>
        <h3>Principe</h3>
        <p>Chaque joueur dispose de <strong>40 pièces</strong> (10 rangs) placées face cachée. Les deux armées s'affrontent sur un champ de bataille 10×10.</p>

        <h3>Hiérarchie (du plus fort au plus faible)</h3>
        <table>
          <thead>
            <tr><th>Rang</th><th>⚔️ Romain</th><th>🎩 Napoléon</th><th>Qté</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in rules" :key="r.rank">
              <td>{{ r.rank >= 0 ? r.rank : '💣' }}</td>
              <td>{{ r.roman }}</td>
              <td>{{ r.napoleon }}</td>
              <td>×{{ r.count }}</td>
            </tr>
          </tbody>
        </table>

        <h3>Résolution des combats</h3>
        <p>Le grade le plus élevé gagne. Égalité → les deux pièces sont détruites.<br>
           <strong>Exception :</strong> l'Espion (rang 1) tue le Commandant suprême (rang 10) s'il attaque en premier.<br>
           <strong>Mines :</strong> immobiles, détruisent toute pièce sauf le démineur (rang 3).</p>

        <h3>Objectif</h3>
        <p>Capturer le drapeau adverse ou éliminer toutes les pièces mobiles ennemies.</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 100;
  display: flex; justify-content: center; align-items: center;
}
.modal {
  background: #161b22; border: 1px solid #30363d; border-radius: 12px;
  padding: 18px; max-width: 480px; max-height: 85vh; overflow-y: auto; margin: 10px;
}
.modal h2 { color: #58a6ff; margin-bottom: 6px; font-size: 0.95rem; }
.modal h3 { color: #bc8cff; margin: 8px 0 4px; font-size: 0.75rem; }
.modal p { font-size: 0.68rem; line-height: 1.4; color: #8b949e; }
.modal table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 0.62rem; }
.modal th { text-align: left; color: #c9d1d9; padding: 2px 5px; border-bottom: 1px solid #30363d; }
.modal td { padding: 2px 5px; border-bottom: 1px solid #21262d; color: #8b949e; }
.modal-close { float: right; background: none; border: none; color: #8b949e; font-size: 1.1rem; cursor: pointer; }
.modal-close:hover { color: #f85149; }
</style>
