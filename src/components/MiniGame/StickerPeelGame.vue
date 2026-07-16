<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'
import type { StickerTrayItem } from '@/types'

interface Props {
  visible: boolean
  item?: StickerTrayItem
}

interface Emits {
  'update:visible': [visible: boolean]
  complete: [instanceId: string, quality: number]
  closed: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const progress: Ref<number> = ref(0)
const startX: Ref<number | undefined> = ref(undefined)
const lastX: Ref<number | undefined> = ref(undefined)
const reversals: Ref<number> = ref(0)

watch((): boolean => props.visible, (visible: boolean): void => {
  if (!visible) return
  progress.value = 0
  startX.value = undefined
  lastX.value = undefined
  reversals.value = 0
})

const updateVisible = (visible: boolean): void => emit('update:visible', visible)

const startPeel = (event: PointerEvent): void => {
  startX.value = event.clientX
  lastX.value = event.clientX
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// Отвечает за движение по линии отделения и учитывает обратные движения руки.
const movePeel = (event: PointerEvent): void => {
  if (startX.value === undefined) return
  if (lastX.value !== undefined && event.clientX < lastX.value - 3) reversals.value += 1
  lastX.value = event.clientX
  const nextProgress: number = ((event.clientX - startX.value) / 230) * 100
  progress.value = Math.max(0, Math.min(100, Math.round(nextProgress)))
}

const finishGesture = (): void => {
  startX.value = undefined
  lastX.value = undefined
}

// Рассчитывает качество снятия защитного слоя: 100, 95 или 80.
const completePeel = (): void => {
  if (!props.item || progress.value < 40) return
  const quality: number = progress.value >= 90 && reversals.value <= 1
    ? 100
    : progress.value >= 65
      ? 95
      : 80
  emit('complete', props.item.instance.id, quality)
  emit('update:visible', false)
}

const handleHide = (): void => emit('closed')
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('stickerTray.peelTitle')"
    :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
    @update:visible="updateVisible"
    @hide="handleHide"
  >
    <p class="text-sm text-ink/65">{{ t('stickerTray.peelText') }}</p>

    <div class="mt-5 [perspective:900px]">
      <div class="relative mx-auto aspect-[2/3] w-36 overflow-hidden rounded border-2 border-ink bg-[#ece8dd] shadow-xl [transform:rotateY(180deg)]">
        <img v-if="item" class="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-20" :src="item.card.image" alt="" />
        <div class="absolute inset-2 rounded border border-dashed border-ink/25 bg-white/75" />
        <span class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs font-black uppercase tracking-widest text-ink/45">
          {{ t('stickerTray.protectiveLayer') }}
        </span>
      </div>
    </div>

    <div class="mt-5 rounded bg-ink/10 p-1">
      <div class="relative h-12 overflow-hidden rounded bg-paper">
        <div class="absolute inset-y-0 left-0 bg-mint transition-[width]" :style="{ width: `${progress}%` }" />
        <div class="pointer-events-none absolute inset-y-0 left-3 right-3 top-1/2 border-t-2 border-dashed border-ink/30" />
        <button
          class="absolute inset-y-1 w-12 cursor-ew-resize rounded bg-coral text-sm font-black text-white shadow"
          :style="{ left: `clamp(0.25rem, calc(${progress}% - 1.5rem), calc(100% - 3.25rem))` }"
          type="button"
          :aria-label="t('stickerTray.protectiveLayer')"
          @pointerdown="startPeel"
          @pointermove="movePeel"
          @pointerup="finishGesture"
          @pointercancel="finishGesture"
        >
          →
        </button>
      </div>
    </div>
    <p class="mt-3 text-center text-xs font-bold text-ink/55">{{ t('stickerTray.peelProgress', { progress }) }}</p>

    <template #footer>
      <Button
        :label="t('stickerTray.place')"
        icon="pi pi-check"
        type="button"
        :disabled="progress < 40"
        @click="completePeel"
      />
    </template>
  </Dialog>
</template>
