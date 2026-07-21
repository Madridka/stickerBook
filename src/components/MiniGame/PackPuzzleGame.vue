<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  ref,
  type ComputedRef,
  type CSSProperties,
  type Ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressBar from 'primevue/progressbar'

import gameData from '@/data/mainConst.json'
import cards from '@/data/wc-26/players'
import type { PlayerCard } from '@/types'

interface PuzzleLayout {
  columns: number
  rows: number
}

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const config = gameData.packHunt.puzzle

const selectCard = (): PlayerCard => {
  const candidates: PlayerCard[] = cards.filter(
    (card: PlayerCard): boolean => card.type === 'player' && card.weight > 0,
  )
  const scores: number[] = candidates.map(({ weight }): number =>
    Math.pow(1 / weight, config.lowWeightBiasPower),
  )
  const totalScore: number = scores.reduce((total, score): number => total + score, 0)
  let cursor: number = Math.random() * totalScore

  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= scores[index] ?? 0
    if (cursor <= 0) return candidates[index]!
  }
  return candidates[candidates.length - 1] ?? cards[0]!
}

const shuffle = (values: number[]): number[] => {
  const result: number[] = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target: number = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  if (result.every((value, index): boolean => value === index) && result.length > 1) {
    result.push(result.shift()!)
  }
  return result
}

const card: PlayerCard = selectCard()
const fragmentCount: number =
  config.fragmentCountMin +
  Math.floor(Math.random() * (config.fragmentCountMax - config.fragmentCountMin + 1))
const layout: PuzzleLayout =
  fragmentCount === 4
    ? { columns: 2, rows: 2 }
    : fragmentCount === 5
      ? { columns: 1, rows: 5 }
      : { columns: 2, rows: 3 }
const pieceIds: number[] = Array.from({ length: fragmentCount }, (_, index): number => index)
const trayOrder: number[] = shuffle(pieceIds)
const placedSlots: Ref<Array<number | undefined>> = ref(
  Array.from({ length: fragmentCount }, (): undefined => undefined),
)
const selectedPiece: Ref<number | undefined> = ref(undefined)
const draggedPiece: Ref<number | undefined> = ref(undefined)
const feedbackKey: Ref<string> = ref('packHunt.puzzle.selectPiece')
const isComplete: Ref<boolean> = ref(false)
let feedbackTimer: number | undefined
let completionTimer: number | undefined

const placedCount: ComputedRef<number> = computed(
  (): number => placedSlots.value.filter((pieceId): boolean => pieceId !== undefined).length,
)
const availablePieces: ComputedRef<number[]> = computed((): number[] =>
  trayOrder.filter((pieceId): boolean => !placedSlots.value.includes(pieceId)),
)
const boardStyle: CSSProperties = {
  gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
  aspectRatio: String(config.cardAspectRatio),
}

const pieceStyle = (pieceId: number): CSSProperties => {
  const column: number = pieceId % layout.columns
  const row: number = Math.floor(pieceId / layout.columns)
  return {
    aspectRatio: String((config.cardAspectRatio * layout.rows) / layout.columns),
    backgroundImage: `url(${card.image})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${layout.columns * 100}% ${layout.rows * 100}%`,
    backgroundPosition: `${layout.columns === 1 ? 50 : (column / (layout.columns - 1)) * 100}% ${
      layout.rows === 1 ? 50 : (row / (layout.rows - 1)) * 100
    }%`,
  }
}

const showWrongSlot = (): void => {
  feedbackKey.value = 'packHunt.puzzle.wrongSlot'
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer)
  feedbackTimer = window.setTimeout((): void => {
    feedbackTimer = undefined
    feedbackKey.value =
      selectedPiece.value === undefined
        ? 'packHunt.puzzle.selectPiece'
        : 'packHunt.puzzle.pieceSelected'
  }, 1000)
}

const placePiece = (pieceId: number | undefined, slotIndex: number): void => {
  if (pieceId === undefined || isComplete.value || placedSlots.value.includes(pieceId)) return
  if (pieceId !== slotIndex) {
    showWrongSlot()
    return
  }

  const nextSlots: Array<number | undefined> = [...placedSlots.value]
  nextSlots[slotIndex] = pieceId
  placedSlots.value = nextSlots
  selectedPiece.value = undefined
  draggedPiece.value = undefined

  if (placedCount.value < fragmentCount) {
    feedbackKey.value = 'packHunt.puzzle.selectPiece'
    return
  }

  isComplete.value = true
  feedbackKey.value = 'packHunt.puzzle.complete'
  completionTimer = window.setTimeout((): void => {
    completionTimer = undefined
    emit('complete')
  }, config.completionDelayMs)
}

const selectPiece = (pieceId: number): void => {
  if (isComplete.value) return
  selectedPiece.value = pieceId
  feedbackKey.value = 'packHunt.puzzle.pieceSelected'
}

const handleDragStart = (event: DragEvent, pieceId: number): void => {
  selectPiece(pieceId)
  draggedPiece.value = pieceId
  event.dataTransfer?.setData('text/plain', String(pieceId))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (event: DragEvent, slotIndex: number): void => {
  const transferredValue: string = event.dataTransfer?.getData('text/plain') ?? ''
  const transferred: number = Number(transferredValue)
  const pieceId: number | undefined =
    transferredValue !== '' && Number.isInteger(transferred) ? transferred : draggedPiece.value
  placePiece(pieceId, slotIndex)
}

const handlePointerDown = (event: PointerEvent, pieceId: number): void => {
  selectPiece(pieceId)
  if (event.pointerType !== 'mouse') {
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
}

// На сенсорных устройствах отпускание части над слотом работает как drag-and-drop.
const handlePointerUp = (event: PointerEvent, pieceId: number): void => {
  const target: Element | null = document.elementFromPoint(event.clientX, event.clientY)
  const slot: HTMLElement | null = target?.closest<HTMLElement>('[data-puzzle-slot]') ?? null
  if (!slot) return
  const slotIndex: number = Number(slot.dataset.puzzleSlot)
  if (Number.isInteger(slotIndex)) placePiece(pieceId, slotIndex)
}

onBeforeUnmount((): void => {
  if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.puzzle.title')">
    <div class="mb-3 flex items-center justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.14em] text-ink/45">
          {{ t('packHunt.puzzle.cardLabel', { name: card.fullName }) }}
        </p>
        <p
          class="mt-1 text-sm font-bold"
          :class="feedbackKey === 'packHunt.puzzle.wrongSlot' ? 'text-red-600' : 'text-coral'"
          aria-live="polite"
        >
          {{ isComplete ? t('packHunt.puzzle.finishing') : t(feedbackKey) }}
        </p>
      </div>
      <span class="shrink-0 text-xs font-black tabular-nums text-ink/55">
        {{ t('packHunt.puzzle.progress', { placed: placedCount, total: fragmentCount }) }}
      </span>
    </div>

    <ProgressBar
      class="instant-progress mb-4 h-1.5"
      :value="Math.round((placedCount / fragmentCount) * 100)"
      :show-value="false"
    />

    <div class="grid min-h-0 grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,1fr)_1fr]">
      <div
        class="mx-auto grid w-full max-w-[15rem] gap-1 border-4 border-ink bg-ink p-1 shadow-[6px_6px_0_rgb(var(--color-gold)/0.55)]"
        :style="boardStyle"
        role="group"
        :aria-label="t('packHunt.puzzle.boardLabel')"
      >
        <button
          v-for="slotIndex in pieceIds"
          :key="slotIndex"
          type="button"
          data-puzzle-slot
          :data-puzzle-slot="slotIndex"
          class="relative min-h-0 overflow-hidden border border-dashed border-paper/55 bg-paper/10 transition-colors focus-visible:ring-4 focus-visible:ring-coral"
          :class="selectedPiece === slotIndex ? 'bg-coral/25' : ''"
          :aria-label="t('packHunt.puzzle.slotLabel', { number: slotIndex + 1 })"
          @click="placePiece(selectedPiece, slotIndex)"
          @dragover.prevent
          @drop.prevent="handleDrop($event, slotIndex)"
        >
          <span
            v-if="placedSlots[slotIndex] !== undefined"
            class="absolute inset-0 bg-cover"
            :style="pieceStyle(placedSlots[slotIndex] ?? slotIndex)"
            aria-hidden="true"
          />
          <span v-else class="text-xs font-black text-paper/35">{{ slotIndex + 1 }}</span>
        </button>
      </div>

      <div
        class="grid grid-cols-2 content-center gap-3 sm:grid-cols-2"
        role="group"
        :aria-label="t('packHunt.puzzle.trayLabel')"
      >
        <button
          v-for="pieceId in availablePieces"
          :key="pieceId"
          type="button"
          draggable="true"
          class="min-h-8 w-full touch-none border-2 border-ink bg-paper shadow-[3px_3px_0_rgb(var(--color-ink)/0.18)] transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-coral/40"
          :class="selectedPiece === pieceId ? '-translate-y-1 ring-4 ring-coral' : ''"
          :style="pieceStyle(pieceId)"
          :aria-label="t('packHunt.puzzle.pieceLabel', { number: pieceId + 1 })"
          @click="selectPiece(pieceId)"
          @dragstart="handleDragStart($event, pieceId)"
          @dragend="draggedPiece = undefined"
          @pointerdown="handlePointerDown($event, pieceId)"
          @pointerup="handlePointerUp($event, pieceId)"
        />

        <div
          v-if="isComplete"
          class="col-span-2 flex min-h-28 items-center justify-center border-2 border-mint bg-mint/35 text-center"
        >
          <div>
            <i class="pi pi-check-circle text-3xl text-emerald-700" />
            <p class="mt-2 font-black">{{ t('packHunt.puzzle.complete') }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
