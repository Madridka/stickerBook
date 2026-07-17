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
  'drag-start': [playerId: string]
  drop: [result: StickerDropResult]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isDragging: Ref<boolean> = ref(false)
const pointerX: Ref<number> = ref(0)
const pointerY: Ref<number> = ref(0)
const dragStartX: Ref<number> = ref(0)
const dragStartY: Ref<number> = ref(0)

// Первый выбор открывает подготовку, повторный захват переносит готовую наклейку.
const startDrag = (event: PointerEvent): void => {
  if (!props.prepared) {
    emit('prepare', props.instance.id)
    return
  }
  emit('drag-start', props.instance.playerId)
  isDragging.value = true
  pointerX.value = event.clientX
  pointerY.value = event.clientY
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
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
  if (Math.hypot(event.clientX - dragStartX.value, event.clientY - dragStartY.value) < 10) return
  const result: StickerDropResult | undefined = evaluateStickerDrop(
    { x: event.clientX, y: event.clientY },
    { instanceId: props.instance.id, playerId: props.instance.playerId },
  )
  if (result) emit('drop', result)
}
</script>

<template>
  <button
    class="sticker-tray-card group flex h-32 w-60 shrink-0 touch-none cursor-pointer items-center gap-3 rounded border-2 border-ink/15 bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-coral"
    :class="{ 'border-mint ring-2 ring-mint/50': prepared, 'opacity-50': isDragging }"
    type="button"
    :aria-label="card.fullName"
    @pointerdown="startDrag"
    @pointermove="moveDrag"
    @pointerup="finishDrag"
    @pointercancel="finishDrag"
  >
    <div class="sticker-tray-card__preview h-28 w-[4.7rem] shrink-0 overflow-hidden rounded border border-ink/10">
      <StickerThumbnail :card="card" :instance="instance" />
    </div>
    <div class="min-w-0 flex-1">
      <span class="sticker-tray-card__id text-[10px] font-black uppercase tracking-[0.14em] text-coral">{{ card.id }}</span>
      <strong class="sticker-tray-card__name mt-1 block text-sm font-black leading-tight">{{ card.fullName }}</strong>
      <span
        class="sticker-tray-card__action mt-3 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-black uppercase tracking-wide"
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
      class="sticker-drag-preview pointer-events-none fixed z-[9999] h-48 w-32 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded border-2 border-mint bg-white shadow-2xl"
      :style="{ left: `${pointerX}px`, top: `${pointerY}px` }"
    >
      <StickerThumbnail :card="card" :instance="instance" />
    </div>
  </Teleport>
</template>

<style scoped>
@media (max-width: 767px) {
  .sticker-tray-card {
    width: 10.75rem;
    height: 6rem;
    gap: 0.5rem;
    padding: 0.375rem;
    border-width: 1px;
  }

  .sticker-tray-card__preview {
    width: 3.33rem;
    height: 5rem;
  }

  .sticker-tray-card__id {
    font-size: 0.48rem;
    letter-spacing: 0.1em;
  }

  .sticker-tray-card__name {
    margin-top: 0.125rem;
    font-size: 0.68rem;
  }

  .sticker-tray-card__action {
    gap: 0.2rem;
    margin-top: 0.375rem;
    padding: 0.2rem 0.35rem;
    font-size: 0.45rem;
    letter-spacing: 0.04em;
  }

  .sticker-tray-card__action i {
    font-size: 0.55rem;
  }

  .sticker-drag-preview {
    width: 5.33rem;
    height: 8rem;
  }
}
</style>
