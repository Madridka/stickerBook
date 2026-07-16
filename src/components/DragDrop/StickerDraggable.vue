<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StickerThumbnail from '@/components/Sticker/StickerThumbnail.vue'
import { evaluateStickerDrop } from '@/components/DragDrop/dropGeometry'
import type { PlayerCard, StickerDropResult, StickerInstance } from '@/types'

interface Props {
  card: PlayerCard
  instance: StickerInstance
  prepared: boolean
}

interface Emits {
  prepare: [instanceId: string]
  drop: [result: StickerDropResult]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isDragging: Ref<boolean> = ref(false)
const pointerX: Ref<number> = ref(0)
const pointerY: Ref<number> = ref(0)

// Начинает перенос подготовленной карточки или открывает мини-игру подготовки.
const startDrag = (event: PointerEvent): void => {
  if (!props.prepared) {
    emit('prepare', props.instance.id)
    return
  }
  isDragging.value = true
  pointerX.value = event.clientX
  pointerY.value = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const moveDrag = (event: PointerEvent): void => {
  if (!isDragging.value) return
  pointerX.value = event.clientX
  pointerY.value = event.clientY
}

// Завершает перенос и передаёт оценку ближайшего слота в игровой слой альбома.
const finishDrag = (event: PointerEvent): void => {
  if (!isDragging.value) return
  isDragging.value = false
  const result: StickerDropResult | undefined = evaluateStickerDrop(
    { x: event.clientX, y: event.clientY },
    { instanceId: props.instance.id, playerId: props.instance.playerId },
  )
  if (result) emit('drop', result)
}
</script>

<template>
  <button
    class="relative h-36 w-24 shrink-0 touch-none cursor-grab rounded border-2 border-ink/20 bg-white shadow-md transition hover:-translate-y-1 active:cursor-grabbing"
    :class="{ 'border-mint ring-2 ring-mint/50': prepared, 'opacity-50': isDragging }"
    type="button"
    :aria-label="card.fullName"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @pointerup="finishDrag"
    @pointercancel="finishDrag"
  >
    <StickerThumbnail :card="card" :instance="instance" />
    <span v-if="prepared" class="absolute bottom-1 right-1 rounded bg-mint px-1 text-[9px] font-black text-ink">
      {{ t('stickerTray.ready') }}
    </span>
  </button>

  <Teleport to="body">
    <div
      v-if="isDragging"
      class="pointer-events-none fixed z-[9999] h-36 w-24 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded border-2 border-mint bg-white shadow-2xl"
      :style="{ left: `${pointerX}px`, top: `${pointerY}px` }"
    >
      <StickerThumbnail :card="card" :instance="instance" />
    </div>
  </Teleport>
</template>
