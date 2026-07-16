<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import type { PlayerCard, StickerInstance } from '@/types'

export interface StickerTrayCard {
  card: PlayerCard
  instance: StickerInstance
}

export interface StickerDrop {
  cardId: string
  slotId: string
  x: number
  y: number
}

interface Props {
  cards: StickerTrayCard[]
}

interface Emits {
  ready: [cardId: string, quality: number]
  drop: [placement: StickerDrop]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const peelCardId: Ref<string | undefined> = ref(undefined)
const isPeelOpen: Ref<boolean> = ref(false)
const peelProgress: Ref<number> = ref(0)
const peelStartX: Ref<number | undefined> = ref(undefined)
const draggingCardId: Ref<string | undefined> = ref(undefined)
const dragX: Ref<number> = ref(0)
const preparedIds: Ref<Set<string>> = ref(new Set())

const peelCard = computed((): StickerTrayCard | undefined =>
  props.cards.find(({ card }): boolean => card.id === peelCardId.value),
)

// Открывает мини-игру подготовки карточки перед первым перемещением
const openPeel = (cardId: string): void => {
  if (preparedIds.value.has(cardId)) return
  peelCardId.value = cardId
  peelProgress.value = 0
  isPeelOpen.value = true
}

// Запоминает начало движения защитной полоски
const startPeel = (event: PointerEvent): void => {
  peelStartX.value = event.clientX
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// Снимает защитный слой горизонтальным жестом и обновляет прогресс мини-игры
const movePeel = (event: PointerEvent): void => {
  if (peelStartX.value === undefined) return
  const progress: number = ((event.clientX - peelStartX.value) / 190) * 100
  peelProgress.value = Math.max(0, Math.min(100, Math.round(progress)))
}

// Завершает мини-игру и сохраняет получившееся качество карточки
const finishPeel = (): void => {
  if (!peelCard.value || peelProgress.value === 0) return
  const quality: number = Math.max(55, Math.round(55 + peelProgress.value * 0.45))
  preparedIds.value = new Set([...preparedIds.value, peelCard.value.card.id])
  emit('ready', peelCard.value.card.id, quality)
  peelStartX.value = undefined
  peelCardId.value = undefined
  isPeelOpen.value = false
}

// Находит ячейку под пальцем и передаёт в альбом точное положение отпускания
const dropCard = (event: PointerEvent, cardId: string): void => {
  draggingCardId.value = undefined
  const target: HTMLElement | null = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>('[data-sticker-slot]') ?? null
  if (!target || !preparedIds.value.has(cardId)) {
    openPeel(cardId)
    return
  }
  const bounds: DOMRect = target.getBoundingClientRect()
  emit('drop', {
    cardId,
    slotId: target.dataset.stickerSlot ?? '',
    x: Math.round(((event.clientX - bounds.left) / bounds.width - 0.5) * 1000) / 1000,
    y: Math.round(((event.clientY - bounds.top) / bounds.height - 0.5) * 1000) / 1000,
  })
}

// Запускает drag для мыши и touch, сохраняя карточку под указателем
const startDrag = (event: PointerEvent, cardId: string): void => {
  if (peelCardId.value) return
  draggingCardId.value = cardId
  dragX.value = event.clientX
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const moveDrag = (event: PointerEvent): void => {
  if (!draggingCardId.value) return
  dragX.value = event.clientX
}

const endDrag = (event: PointerEvent): void => {
  if (draggingCardId.value) dropCard(event, draggingCardId.value)
}
</script>

<template>
  <section class="w-full max-w-2xl" :aria-label="t('stickerTray.title')">
    <div class="mb-2 flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-coral">{{ t('stickerTray.title') }}</p>
        <p class="mt-1 text-xs text-ink/55">{{ t('stickerTray.hint') }}</p>
      </div>
      <span class="shrink-0 text-xs font-bold text-ink/55">{{ props.cards.length }}</span>
    </div>
    <div v-if="props.cards.length" class="sticker-tray flex gap-3 overflow-x-auto pb-2">
      <button
        v-for="item in props.cards"
        :key="item.instance.id"
        class="sticker-tray__card relative h-28 w-20 shrink-0 cursor-grab overflow-hidden rounded border-2 border-ink/20 bg-white p-1 shadow-md active:cursor-grabbing"
        :class="{ 'sticker-tray__card--dragging': draggingCardId === item.card.id }"
        type="button"
        :aria-label="item.card.fullName"
        @pointerdown="startDrag($event, item.card.id)"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
      >
        <img class="h-full w-full object-contain" :src="item.card.image" :alt="item.card.fullName" draggable="false" />
        <span class="absolute bottom-1 left-1 rounded bg-ink/80 px-1 text-[9px] font-bold text-paper">
          {{ item.instance.quality }}%
        </span>
      </button>
    </div>
    <p v-else class="rounded border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55">
      {{ t('stickerTray.empty') }}
    </p>
  </section>

  <Dialog v-model:visible="isPeelOpen" modal :header="t('stickerTray.peelTitle')" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }">
    <p class="text-sm text-ink/65">{{ t('stickerTray.peelText') }}</p>
    <div class="mt-5 overflow-hidden rounded border-2 border-ink bg-white p-3">
      <img v-if="peelCard" class="mx-auto h-48 w-full object-contain" :src="peelCard.card.image" :alt="peelCard.card.fullName" />
      <div class="relative mt-3 h-12 rounded bg-ink/10">
        <div class="absolute inset-y-0 left-0 rounded bg-mint" :style="{ width: `${peelProgress}%` }" />
        <button
          class="absolute inset-y-1 left-1 w-12 cursor-ew-resize rounded bg-coral text-xs font-black text-white shadow"
          :style="{ left: `calc(${peelProgress}% - 1rem)` }"
          type="button"
          :aria-label="t('stickerTray.protectiveLayer')"
          @pointerdown="startPeel"
          @pointermove="movePeel"
          @pointerup="finishPeel"
          @pointercancel="finishPeel"
        >
          →
        </button>
      </div>
    </div>
    <p class="mt-3 text-center text-xs font-bold text-ink/55">{{ t('stickerTray.peelProgress', { progress: peelProgress }) }}</p>
    <template #footer>
      <Button :label="t('stickerTray.place')" icon="pi pi-check" type="button" :disabled="peelProgress === 0" @click="finishPeel" />
    </template>
  </Dialog>
</template>

<style scoped>
.sticker-tray { scrollbar-width: thin; scrollbar-color: rgb(var(--color-coral) / 0.55) transparent; touch-action: pan-x; }
.sticker-tray__card { transition: transform 160ms ease, box-shadow 160ms ease; }
.sticker-tray__card:hover { transform: translateY(-4px) rotate(-2deg); }
.sticker-tray__card--dragging { opacity: 0.55; transform: translateY(-8px) rotate(3deg); }
</style>
