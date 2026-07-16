<script setup lang="ts">
import type { PlayerCard, StickerPlacement } from '@/types'

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
  placement?: StickerPlacement
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

// Применяет сохранённые смещение и угол наклейки внутри ячейки альбома
const cardStyle = (): Record<string, string> => ({
  transform: `translate(${(props.placement?.x ?? 0) * 100}%, ${(props.placement?.y ?? 0) * 100}%) rotate(${props.placement?.rotation ?? 0}deg)`,
})
</script>

<template>
  <div
    class="absolute overflow-visible rounded-[2px] border-2 border-gold/70 bg-gold/5"
    :style="slotStyle()"
    :aria-label="slot.name"
    :data-player-id="slot.playerId"
    :data-sticker-slot="slot.id"
    role="group"
  >
    <!-- Показывает найденную карточку внутри ячейки, сохраняя её пропорции -->
    <img
      v-if="card"
      class="absolute inset-0 h-full w-full object-contain p-px transition-transform"
      :src="card.image"
      :alt="card.fullName"
      :style="cardStyle()"
    />
  </div>
</template>
