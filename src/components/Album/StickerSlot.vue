<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlbumStore } from '@/stores/album'
import { shouldSnapStickerAlignment } from '@/components/DragDrop/dropGeometry'
import type {
  AlbumGeometryPage,
  AlbumGeometrySlot,
  PlayerCard,
  StickerInstance,
  StickerPlacement,
  StickerPreparation,
} from '@/types'

interface Props {
  slot: AlbumGeometrySlot
  page: AlbumGeometryPage
  targetCard?: PlayerCard
  card?: PlayerCard
  instance?: StickerInstance
  placement?: StickerPlacement
  preparation?: StickerPreparation
  highlighted?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ preview: [instance: StickerInstance] }>()
const { t } = useI18n()
const album = useAlbumStore()
const targetName: ComputedRef<string> = computed(
  (): string => props.targetCard?.fullName ?? props.slot.name,
)
const slotCode: ComputedRef<string> = computed((): string =>
  props.slot.id.toUpperCase().replace('-', ' '),
)
const slotStyle = (): Record<string, string> => album.geometry.getSlotStyle(props.slot, props.page)
const cardStyle = (): Record<string, string> => {
  let x: number = props.placement?.x ?? 0
  let y: number = props.placement?.y ?? 0
  const rotation: number = props.placement?.rotation ?? 0
  const wasIncorrectlySnapped: boolean =
    x === 0 &&
    y === 0 &&
    rotation === 0 &&
    Boolean(props.preparation) &&
    !shouldSnapStickerAlignment(
      props.preparation?.alignmentX ?? 0,
      props.preparation?.alignmentY ?? 0,
    )
  if (wasIncorrectlySnapped) {
    x = props.preparation?.alignmentX ?? 0
    y = props.preparation?.alignmentY ?? 0
  }
  return {
    transform: x === 0 && y === 0 && rotation === 0
      ? 'none'
      : `translate(${x * 100}%, ${y * 100}%) rotate(${rotation}deg)`,
  }
}

const previewCard = (): void => {
  if (props.instance) emit('preview', props.instance)
}
</script>

<template>
  <div
    class="absolute rounded-[2px] border border-gold/80 bg-[rgb(250_245_231/0.92)] shadow-inner transition-[box-shadow,transform,background-color] duration-[180ms] ease-[ease] before:pointer-events-none before:absolute before:inset-[3%] before:border before:border-gold/[0.58] before:content-['']"
    :class="{
      'z-[15] animate-target-pulse bg-[rgb(var(--color-mint)/0.92)] shadow-[0_0_0_3px_rgb(var(--color-paper)),0_0_0_7px_rgb(var(--color-coral)),0_0_26px_rgb(var(--color-coral)/0.8)]':
        highlighted && !card,
      '!border-0 !bg-transparent !shadow-none before:hidden': card,
    }"
    :style="slotStyle()"
    :aria-label="t('album.slotTarget', { name: targetName })"
    :title="targetName"
    :data-player-id="slot.playerId"
    :data-sticker-slot="slot.id"
    :data-occupied="Boolean(card)"
    role="group"
  >
    <!-- Пустой слот показывает номер и имя игрока вместо служебных координат. -->
    <div
      v-if="!card"
      class="pointer-events-none absolute inset-0 flex flex-col items-center justify-between p-[6%] text-center"
    >
      <span
        class="rounded bg-ink/90 px-1.5 py-0.5 text-[clamp(0.38rem,0.55vw,0.65rem)] font-black text-paper max-md:px-1 max-md:py-[0.1rem] max-md:text-[clamp(0.25rem,1.1vw,0.4rem)]"
      >
        {{ slotCode }}
      </span>
      <span
        class="w-full bg-paper/90 px-1 py-1 text-[clamp(0.42rem,0.68vw,0.76rem)] font-black leading-tight text-ink max-md:py-[0.15rem] max-md:text-[clamp(0.28rem,1.3vw,0.48rem)]"
      >
        {{ targetName }}
      </span>
    </div>
    <img
      v-if="card"
      class="absolute inset-0 z-10 h-full w-full cursor-pointer object-fill"
      :src="card.image"
      :alt="card.fullName"
      :style="cardStyle()"
      @click="previewCard"
    />
  </div>
</template>
