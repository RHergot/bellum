<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import type { GridPiece, InHandPiece } from '../types/game'
import { getArmy, getPiece, TILE_COLORS } from '../data/armies'

const props = defineProps<{
  pieces: GridPiece[]
  inHand: InHandPiece | null
  placedCount: number
}>()

const emit = defineEmits<{
  pick: [r: number, c: number]
  place: [r: number, c: number]
  returnToPool: [r: number, c: number]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const hoverCell = ref<{ r: number; c: number } | null>(null)

const BOARD_SIZE = 10
const CELL = 52
const PAD = 8
const W = BOARD_SIZE * CELL + PAD * 2
const H = BOARD_SIZE * CELL + PAD * 2

const army = getArmy(1)

// Build a quick lookup: key → piece on grid
const gridMap = computed(() => {
  const map: Record<string, GridPiece> = {}
  for (const p of props.pieces) {
    map[`${p.r},${p.c}`] = p
  }
  return map
})

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, W, H)

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const x = PAD + c * CELL
      const y = PAD + r * CELL

      // Cell background
      const isDeployment = r >= 6 && r <= 9
      const isLake = [4, 5].includes(r) && [2, 3, 6, 7].includes(c)
      const isHovered = hoverCell.value?.r === r && hoverCell.value?.c === c
      const isTargetable = isDeployment && !isLake && props.inHand !== null

      if (isLake) {
        ctx.fillStyle = '#1a3a5c'
        ctx.fillRect(x, y, CELL, CELL)
        ctx.fillStyle = '#2a5a8c'
        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('🌊', x + CELL / 2, y + CELL / 2)
      } else if (isDeployment) {
        ctx.fillStyle = isHovered && isTargetable
          ? 'rgba(35, 134, 54, 0.4)'
          : 'rgba(35, 134, 54, 0.1)'
        ctx.fillRect(x, y, CELL, CELL)
      } else {
        // Outside deployment zone: darker
        ctx.fillStyle = '#0a0e14'
        ctx.fillRect(x, y, CELL, CELL)
      }

      // Grid lines
      ctx.strokeStyle = '#21262d'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, CELL, CELL)

      // Piece on grid
      const key = `${r},${c}`
      const gridPiece = gridMap.value[key]
      if (gridPiece) {
        const pieceDef = getPiece(army, gridPiece.piece)
        const color = TILE_COLORS[gridPiece.piece] || '#888'

        // Piece background circle
        ctx.fillStyle = isHovered ? '#f0a' : color + 'cc'
        ctx.beginPath()
        ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.35, 0, Math.PI * 2)
        ctx.fill()

        // Emoji
        if (pieceDef) {
          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(pieceDef.emoji, x + CELL / 2, y + CELL / 2)
        }
      } else if (isHovered && props.inHand && isTargetable) {
        // Ghost of piece in hand
        const pieceDef = getPiece(army, props.inHand.key)
        if (pieceDef) {
          ctx.globalAlpha = 0.35
          ctx.font = '18px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(pieceDef.emoji, x + CELL / 2, y + CELL / 2)
          ctx.globalAlpha = 1.0
        }
      }
    }
  }

  // Counter at bottom
  ctx.fillStyle = '#8b949e'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${props.placedCount} / 40 pièces placées`, W / 2, H - 4)
}

function getCellFromEvent(e: MouseEvent): { r: number; c: number } | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const scaleX = CELL * BOARD_SIZE / rect.width
  const scaleY = CELL * BOARD_SIZE / rect.height
  const mx = (e.clientX - rect.left) * scaleX
  const my = (e.clientY - rect.top) * scaleY
  const c = Math.floor((mx - PAD) / CELL)
  const r = Math.floor((my - PAD) / CELL)
  if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return null
  return { r, c }
}

function onClick(e: MouseEvent) {
  const cell = getCellFromEvent(e)
  if (!cell) return
  const { r, c } = cell

  const key = `${r},${c}`
  const existing = gridMap.value[key]

  if (existing) {
    // Cell occupied → pick the piece up
    emit('pick', r, c)
  } else {
    // Empty cell → place current piece
    emit('place', r, c)
  }
}

function onRightClick(e: MouseEvent) {
  e.preventDefault()
  const cell = getCellFromEvent(e)
  if (!cell) return
  const key = `${cell.r},${cell.c}`
  if (gridMap.value[key]) {
    emit('returnToPool', cell.r, cell.c)
  }
}

function onMouseMove(e: MouseEvent) {
  hoverCell.value = getCellFromEvent(e)
  draw()
}

function onMouseLeave() {
  hoverCell.value = null
  draw()
}

onMounted(draw)
watch(() => [props.pieces, props.inHand, props.placedCount], draw, { deep: true })
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="W"
    :height="H"
    class="placement-grid"
    @click="onClick"
    @contextmenu="onRightClick"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  />
</template>

<style scoped>
.placement-grid {
  border: 2px solid #30363d;
  border-radius: 6px;
  display: block;
  cursor: crosshair;
  touch-action: manipulation;
}
</style>
