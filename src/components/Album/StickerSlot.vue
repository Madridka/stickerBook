<script setup lang="ts">
import { useAlbumStore } from '@/stores/album'
import type { AlbumGeometryPage, AlbumGeometrySlot, PlayerCard, StickerPlacement } from '@/types'

interface Props {
  slot: AlbumGeometrySlot
  page: AlbumGeometryPage
  card?: PlayerCard
  placement?: StickerPlacement
}

const props = defineProps<Props>()
const album = useAlbumStore()
const isDebug: boolean = import.meta.env.DEV

const slotStyle = (): Record<string, string> => album.geometry.getSlotStyle(props.slot, props.page)

const cardStyle = (): Record<string, string> => ({
  transform: `translate(${(props.placement?.x ?? 0) * 100}%, ${(props.placement?.y ?? 0) * 100}%) rotate(${props.placement?.rotation ?? 0}deg)`,
})
</script>

<template>
  <div
    class="absolute rounded-sm border border-gold/75 bg-paper/90 shadow-inner"
    :class="{ 'outline outline-2 outline-coral outline-offset-1': isDebug }"
    :style="slotStyle()"
    :aria-label="slot.name"
    :data-player-id="slot.playerId"
    :data-sticker-slot="slot.id"
    :data-occupied="Boolean(card)"
    role="group"
  >
    <!-- Debug-плашка показывает координаты только в development-сборке. -->
    <span
      v-if="isDebug"
      class="pointer-events-none absolute -top-5 left-0 z-20 whitespace-nowrap rounded bg-ink/90 px-1 text-[8px] leading-4 text-paper"
    >
      {{ slot.id }} · {{ slot.x }},{{ slot.y }} · {{ slot.width }}×{{ album.geometry.getSlotHeight(slot) }}
    </span>
    <span class="pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(0.45rem,1vw,0.7rem)] font-black text-ink/45">
      {{ slot.id }}
    </span>
    <img
      v-if="card"
      class="absolute inset-0 z-10 h-full w-full object-fill"
      :src="card.image"
      :alt="card.fullName"
      :style="cardStyle()"
    />
  </div>
</template>
