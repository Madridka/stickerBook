<script setup lang="ts">
import type { AlbumGeometryPage, AlbumGeometrySlot, PlayerCard, StickerPlacement } from '@/types'

interface Props {
  slot: AlbumGeometrySlot
  page: AlbumGeometryPage
  card?: PlayerCard
  placement?: StickerPlacement
}

const props = defineProps<Props>()
const stickerAspectRatio: number = 2 / 3

// Переводит координаты страницы альбома в относительные CSS-координаты слота.
const slotStyle = (): Record<string, string> => ({
  left: `${(props.slot.x / props.page.width) * 100}%`,
  top: `${(props.slot.y / props.page.height) * 100}%`,
  width: `${(props.slot.width / props.page.width) * 100}%`,
  aspectRatio: `${stickerAspectRatio}`,
})

// Применяет сохранённое смещение и угол наклейки внутри ячейки альбома.
const cardStyle = (): Record<string, string> => ({
  transform: `translate(${(props.placement?.x ?? 0) * 100}%, ${(props.placement?.y ?? 0) * 100}%) rotate(${props.placement?.rotation ?? 0}deg)`,
})
</script>

<template>
  <div
    class="absolute overflow-visible rounded-[2px] border-2 border-gold/80 bg-[#0d4f42] shadow-inner"
    :style="slotStyle()"
    :aria-label="slot.name"
    :data-player-id="slot.playerId"
    :data-sticker-slot="slot.id"
    role="group"
  >
    <!-- Карточка рисуется поверх рамки слота и закрывает её при точном совпадении размеров. -->
    <img
      v-if="card"
      class="absolute inset-0 z-10 h-full w-full object-fill transition-transform"
      :src="card.image"
      :alt="card.fullName"
      :style="cardStyle()"
    />
    <span v-else class="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(0.45rem,1.6vw,0.75rem)] font-black text-gold/90">
      {{ slot.name }}
    </span>
  </div>
</template>
