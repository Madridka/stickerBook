<script setup lang="ts">
import type { PlayerCard } from '@/types'

export interface StickerSlotData {
  id: string
  playerId: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

interface Props {
  slot: StickerSlotData
  card?: PlayerCard
}

const props = defineProps<Props>()
const canvasWidth: number = 390
const canvasHeight: number = 844

// Переводит координаты макета PNG в относительные CSS-координаты
const slotStyle = (): Record<string, string> => ({
  left: `${(props.slot.x / canvasWidth) * 100}%`,
  top: `${(props.slot.y / canvasHeight) * 100}%`,
  width: `${(props.slot.width / canvasWidth) * 100}%`,
  height: `${(props.slot.height / canvasHeight) * 100}%`,
})
</script>

<template>
  <div
    class="pointer-events-none absolute overflow-hidden rounded-[2px] border-2 border-gold/70 bg-gold/5"
    :style="slotStyle()"
    :aria-label="slot.name"
    :data-player-id="slot.playerId"
    role="group"
  >
    <!-- Показывает найденную карточку внутри ячейки, сохраняя её пропорции -->
    <img
      v-if="card"
      class="absolute inset-0 h-full w-full object-contain p-px"
      :src="card.image"
      :alt="card.fullName"
    />
  </div>
</template>
