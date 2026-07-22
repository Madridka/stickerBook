<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CardDefinition, StickerDropResult, StickerInstance } from '@/types'

import { evaluateStickerDrop } from '@/components/DragDrop/dropGeometry'
import StickerThumbnail from '@/components/Sticker/StickerThumbnail.vue'

interface Props {
  card: CardDefinition
  instance: StickerInstance
  prepared: boolean
}

interface Emits {
  prepare: [instanceId: string]
  preview: []
  'drag-start': [playerId: string]
  drop: [result: StickerDropResult]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isPointerActive: Ref<boolean> = ref(false)
const isDragging: Ref<boolean> = ref(false)
const pointerX: Ref<number> = ref(0)
const pointerY: Ref<number> = ref(0)
const dragStartX: Ref<number> = ref(0)
const dragStartY: Ref<number> = ref(0)
const dragThreshold: number = 10

// Первый выбор открывает подготовку, повторный захват переносит готовую наклейку.
const startDrag = (event: PointerEvent): void => {
  if (event.button !== 0) return
  isPointerActive.value = true
  pointerX.value = event.clientX
  pointerY.value = event.clientY
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const moveDrag = (event: PointerEvent): void => {
  if (!isPointerActive.value) return
  pointerX.value = event.clientX
  pointerY.value = event.clientY

  if (!props.prepared || isDragging.value) return
  const deltaX: number = event.clientX - dragStartX.value
  const deltaY: number = event.clientY - dragStartY.value
  if (Math.hypot(deltaX, deltaY) < dragThreshold) return

  // Горизонтальный жест пальцем прокручивает трей, вертикальный начинает перенос наклейки.
  if (event.pointerType === 'touch' && Math.abs(deltaX) > Math.abs(deltaY)) return
  emit('drag-start', props.instance.playerId)
  isDragging.value = true
}

// Завершает перенос и передаёт оценку ближайшего слота в игровой слой альбома.
const finishDrag = (event: PointerEvent): void => {
  if (!isPointerActive.value) return
  isPointerActive.value = false
  const movement: number = Math.hypot(
    event.clientX - dragStartX.value,
    event.clientY - dragStartY.value,
  )

  if (!props.prepared) {
    if (movement < dragThreshold) emit('preview')
    return
  }
  if (!isDragging.value) {
    emit('preview')
    return
  }
  isDragging.value = false
  const result: StickerDropResult | undefined = evaluateStickerDrop(
    { x: event.clientX, y: event.clientY },
    {
      instanceId: props.instance.id,
      playerId: props.instance.playerId,
      albumSlotId: props.card.baseCardId ?? props.card.id,
    },
  )
  if (result) emit('drop', result)
}

const cancelDrag = (): void => {
  isPointerActive.value = false
  isDragging.value = false
}

const handleKeyboardClick = (event: MouseEvent): void => {
  if (event.detail === 0) emit('preview')
}
</script>

<template>
  <button
    class="group flex h-32 w-60 shrink-0 touch-pan-x cursor-pointer items-center gap-3 rounded border-2 border-ink/15 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-coral max-md:h-24 max-md:w-[10.75rem] max-md:gap-2 max-md:border max-md:p-1.5"
    :class="{ 'border-mint ring-2 ring-mint/50': prepared, 'opacity-50': isDragging }"
    type="button"
    :aria-label="card.displayName"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @pointerup="finishDrag"
    @pointercancel="cancelDrag"
    @click="handleKeyboardClick"
  >
    <div
      class="h-28 w-[4.7rem] shrink-0 overflow-hidden rounded border border-ink/10 max-md:h-20 max-md:w-[3.33rem]"
    >
      <StickerThumbnail :card="card" :instance="instance" />
    </div>
    <div class="min-w-0 flex-1">
      <span
        class="text-[10px] font-black uppercase tracking-[0.14em] text-coral max-md:text-[0.48rem] max-md:tracking-[0.1em]"
        >{{ card.id }}</span
      >
      <strong
        class="mt-1 block text-sm font-black leading-tight max-md:mt-0.5 max-md:text-[0.68rem]"
        >{{ card.displayName }}</strong
      >
      <span
        class="mt-3 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide max-md:mt-1.5 max-md:gap-[0.2rem] max-md:px-[0.35rem] max-md:py-[0.2rem] max-md:text-[0.45rem] max-md:tracking-[0.04em] max-md:[&_i]:text-[0.55rem]"
        :class="prepared ? 'bg-mint text-ink' : 'bg-ink/10 text-ink/60'"
      >
        <i :class="prepared ? 'pi pi-arrows-alt' : 'pi pi-sparkles'" />
        {{ prepared ? t('stickerTray.dragAction') : t('stickerTray.prepareAction') }}
      </span>
    </div>
  </button>

  <Teleport to="body">
    <div
      v-if="isDragging"
      class="pointer-events-none fixed z-[9999] h-48 w-32 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded border-2 border-mint bg-white shadow-2xl max-md:h-32 max-md:w-[5.33rem]"
      :style="{ left: `${pointerX}px`, top: `${pointerY}px` }"
    >
      <StickerThumbnail :card="card" :instance="instance" />
    </div>
  </Teleport>
</template>
