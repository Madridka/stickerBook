<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlbumStore } from '@/stores/album'
import type { AlbumGeometryPage, AlbumGeometrySlot, PlayerCard, StickerPlacement } from '@/types'

interface Props {
  slot: AlbumGeometrySlot
  page: AlbumGeometryPage
  targetCard?: PlayerCard
  card?: PlayerCard
  placement?: StickerPlacement
  highlighted?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()
const album = useAlbumStore()
const targetName: ComputedRef<string> = computed(
  (): string => props.targetCard?.fullName ?? props.slot.name,
)
const slotCode: ComputedRef<string> = computed(
  (): string => props.slot.id.toUpperCase().replace('-', ' '),
)
const slotStyle = (): Record<string, string> => album.geometry.getSlotStyle(props.slot, props.page)
const cardStyle = (): Record<string, string> => ({
  transform: `translate(${(props.placement?.x ?? 0) * 100}%, ${(props.placement?.y ?? 0) * 100}%) rotate(${props.placement?.rotation ?? 0}deg)`,
})
</script>

<template>
  <div
    class="sticker-slot absolute rounded-[2px] border border-gold/80 shadow-inner"
    :class="{ 'sticker-slot--highlighted': highlighted && !card }"
    :style="slotStyle()"
    :aria-label="t('album.slotTarget', { name: targetName })"
    :title="targetName"
    :data-player-id="slot.playerId"
    :data-sticker-slot="slot.id"
    :data-occupied="Boolean(card)"
    role="group"
  >
    <!-- Пустой слот показывает номер и имя игрока вместо служебных координат. -->
    <div v-if="!card" class="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-[6%] text-center">
      <span class="rounded bg-ink/90 px-1.5 py-0.5 text-[clamp(0.38rem,0.55vw,0.65rem)] font-black text-paper">
        {{ slotCode }}
      </span>
      <span class="w-full bg-paper/90 px-1 py-1 text-[clamp(0.42rem,0.68vw,0.76rem)] font-black leading-tight text-ink">
        {{ targetName }}
      </span>
    </div>
    <img
      v-if="card"
      class="absolute inset-0 z-10 h-full w-full object-fill"
      :src="card.image"
      :alt="card.fullName"
      :style="cardStyle()"
    />
  </div>
</template>

<style scoped>
.sticker-slot {
  background: rgb(250 245 231 / 0.92);
  transition: box-shadow 180ms ease, transform 180ms ease, background-color 180ms ease;
}

.sticker-slot::before {
  content: '';
  position: absolute;
  inset: 3%;
  pointer-events: none;
  border: 1px solid rgb(var(--color-gold) / 0.58);
}

.sticker-slot--highlighted {
  z-index: 15;
  background: rgb(var(--color-mint) / 0.92);
  box-shadow: 0 0 0 3px rgb(var(--color-paper)), 0 0 0 7px rgb(var(--color-coral)), 0 0 26px rgb(var(--color-coral) / 0.8);
  animation: target-pulse 950ms ease-in-out infinite alternate;
}

@keyframes target-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.055); }
}

@media (max-width: 767px) {
  .sticker-slot > div > span:first-child {
    padding: 0.1rem 0.25rem;
    font-size: clamp(0.25rem, 1.1vw, 0.4rem);
  }

  .sticker-slot > div > span:last-child {
    padding: 0.15rem 0.25rem;
    font-size: clamp(0.28rem, 1.3vw, 0.48rem);
  }
}
</style>
