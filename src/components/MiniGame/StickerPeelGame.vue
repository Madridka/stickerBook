<script setup lang="ts">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { useI18n } from 'vue-i18n'
import type { StickerPreparation, StickerTrayItem } from '@/types'

interface Props {
  visible: boolean
  item?: StickerTrayItem
}

interface Emits {
  'update:visible': [visible: boolean]
  complete: [instanceId: string, preparation: StickerPreparation]
  closed: []
}

interface PointerOrigin {
  x: number
  y: number
  offsetX: number
  offsetY: number
}

interface PressZone {
  left: string
  top: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const step: Ref<number> = ref(0)
const progress: Ref<number> = ref(0)
const startX: Ref<number | undefined> = ref(undefined)
const lastX: Ref<number | undefined> = ref(undefined)
const reversals: Ref<number> = ref(0)
const alignX: Ref<number> = ref(38)
const alignY: Ref<number> = ref(-30)
const alignOrigin: Ref<PointerOrigin | undefined> = ref(undefined)
const pressedCount: Ref<number> = ref(0)
const pressMistakes: Ref<number> = ref(0)
const alignmentDistance: ComputedRef<number> = computed(
  (): number => Math.round(Math.hypot(alignX.value, alignY.value)),
)
const pressZones: PressZone[] = [
  { left: '8%', top: '8%' },
  { left: '72%', top: '8%' },
  { left: '72%', top: '76%' },
  { left: '8%', top: '76%' },
]
const stepTranslationKeys: string[] = [
  'stickerTray.stepPeel',
  'stickerTray.stepAlign',
  'stickerTray.stepPress',
]
const alignmentCardWidth: number = 112
const alignmentCardHeight: number = 168

watch((): boolean => props.visible, (visible: boolean): void => {
  if (!visible) return
  step.value = 0
  progress.value = 0
  startX.value = undefined
  lastX.value = undefined
  reversals.value = 0
  alignX.value = 38
  alignY.value = -30
  alignOrigin.value = undefined
  pressedCount.value = 0
  pressMistakes.value = 0
})

const updateVisible = (visible: boolean): void => emit('update:visible', visible)

const startPeel = (event: PointerEvent): void => {
  startX.value = event.clientX
  lastX.value = event.clientX
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// Учитывает плавность снятия основы и штрафует обратные движения руки.
const movePeel = (event: PointerEvent): void => {
  if (startX.value === undefined) return
  if (lastX.value !== undefined && event.clientX < lastX.value - 3) reversals.value += 1
  lastX.value = event.clientX
  const nextProgress: number = ((event.clientX - startX.value) / 260) * 100
  progress.value = Math.max(0, Math.min(100, Math.round(nextProgress)))
}

const finishPeel = (): void => {
  startX.value = undefined
  lastX.value = undefined
}

const startAlignment = (event: PointerEvent): void => {
  alignOrigin.value = {
    x: event.clientX,
    y: event.clientY,
    offsetX: alignX.value,
    offsetY: alignY.value,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// Перемещает наклейку внутри монтажного поля и ограничивает её доступный ход.
const moveAlignment = (event: PointerEvent): void => {
  if (!alignOrigin.value) return
  alignX.value = Math.max(-58, Math.min(58, alignOrigin.value.offsetX + event.clientX - alignOrigin.value.x))
  alignY.value = Math.max(-72, Math.min(72, alignOrigin.value.offsetY + event.clientY - alignOrigin.value.y))
}

const finishAlignment = (): void => {
  alignOrigin.value = undefined
}

const pressCorner = (index: number): void => {
  if (index !== pressedCount.value) {
    pressMistakes.value += 1
    return
  }
  pressedCount.value += 1
}

const nextStep = (): void => {
  if (step.value === 0 && progress.value < 90) return
  if (step.value === 1 && alignmentDistance.value > 14) return
  step.value = Math.min(2, step.value + 1)
}

const previousStep = (): void => {
  step.value = Math.max(0, step.value - 1)
}

// Объединяет качество снятия, совмещения и разглаживания в итог экземпляра.
const completePreparation = (): void => {
  if (!props.item || pressedCount.value < pressZones.length) return
  const peelQuality: number = reversals.value <= 1 && progress.value >= 98 ? 100 : 94
  const alignmentQuality: number = Math.max(90, 100 - Math.round(alignmentDistance.value / 2))
  const pressQuality: number = Math.max(80, 100 - pressMistakes.value * 5)
  const quality: number = Math.min(peelQuality, alignmentQuality, pressQuality)
  const preparation: StickerPreparation = {
    quality,
    alignmentX: Number((alignX.value / alignmentCardWidth).toFixed(4)),
    alignmentY: Number((alignY.value / alignmentCardHeight).toFixed(4)),
  }
  emit('complete', props.item.instance.id, preparation)
  emit('update:visible', false)
}

const handleHide = (): void => emit('closed')
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('stickerTray.peelTitle')"
    :style="{ width: 'min(34rem, calc(100vw - 1.5rem))' }"
    @update:visible="updateVisible"
    @hide="handleHide"
  >
    <div class="mb-5 grid grid-cols-3 gap-2">
      <div
        v-for="index in 3"
        :key="index"
        class="rounded border px-2 py-2 text-center text-[10px] font-black uppercase tracking-wide"
        :class="index - 1 === step ? 'border-coral bg-coral text-white' : index - 1 < step ? 'border-mint bg-mint text-ink' : 'border-ink/10 text-ink/40'"
      >
        {{ t(stepTranslationKeys[index - 1] ?? '') }}
      </div>
    </div>

    <p class="text-[10px] font-black uppercase tracking-[0.16em] text-coral">
      {{ t('stickerTray.stepLabel', { current: step + 1, total: 3 }) }}
    </p>

    <template v-if="step === 0">
      <h2 class="mt-1 text-xl font-black">{{ t('stickerTray.stepPeel') }}</h2>
      <p class="mt-1 text-sm text-ink/65">{{ t('stickerTray.peelText') }}</p>

      <div class="mt-5 [perspective:900px]">
        <div class="relative mx-auto aspect-[2/3] w-28 overflow-hidden rounded border-2 border-ink bg-[#ece8dd] shadow-lg [transform:rotateY(180deg)]">
          <img v-if="item" class="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-20" :src="item.card.image" alt="" />
          <div class="absolute inset-2 rounded border border-dashed border-ink/25 bg-white/75" />
          <span class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[10px] font-black uppercase tracking-widest text-ink/45">
            {{ t('stickerTray.protectiveLayer') }}
          </span>
        </div>
      </div>

      <div class="mt-5 rounded bg-ink/10 p-1">
        <div class="relative h-12 overflow-hidden rounded bg-paper">
          <div class="absolute inset-y-0 left-0 bg-mint transition-[width]" :style="{ width: `${progress}%` }" />
          <div class="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-dashed border-ink/30" />
          <button
            class="absolute inset-y-1 w-12 touch-none cursor-ew-resize rounded bg-coral text-sm font-black text-white shadow"
            :style="{ left: `clamp(0.25rem, calc(${progress}% - 1.5rem), calc(100% - 3.25rem))` }"
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
      <p class="mt-2 text-center text-xs font-bold text-ink/55">{{ t('stickerTray.peelProgress', { progress }) }}</p>
    </template>

    <template v-else-if="step === 1">
      <h2 class="mt-1 text-xl font-black">{{ t('stickerTray.alignTitle') }}</h2>
      <p class="mt-1 text-sm text-ink/65">{{ t('stickerTray.alignText') }}</p>

      <div class="relative mx-auto mt-5 h-72 w-64 overflow-hidden rounded-lg bg-ink/10 shadow-inner">
        <div class="absolute left-1/2 top-1/2 aspect-[2/3] w-28 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-dashed border-coral bg-paper/55" />
        <button
          class="absolute left-1/2 top-1/2 aspect-[2/3] w-28 touch-none overflow-hidden rounded border-2 border-ink bg-white shadow-xl"
          :class="alignmentDistance <= 14 ? 'ring-4 ring-mint' : ''"
          :style="{ transform: `translate(calc(-50% + ${alignX}px), calc(-50% + ${alignY}px))` }"
          type="button"
          :aria-label="t('stickerTray.alignTitle')"
          @pointerdown="startAlignment"
          @pointermove="moveAlignment"
          @pointerup="finishAlignment"
          @pointercancel="finishAlignment"
        >
          <img v-if="item" class="h-full w-full object-cover" :src="item.card.image" :alt="item.card.fullName" />
        </button>
      </div>
      <p class="mt-3 text-center text-xs font-black" :class="alignmentDistance <= 14 ? 'text-emerald-700' : 'text-ink/55'">
        {{ alignmentDistance <= 14 ? t('stickerTray.alignmentReady') : t('stickerTray.alignment', { distance: alignmentDistance }) }}
      </p>
    </template>

    <template v-else>
      <h2 class="mt-1 text-xl font-black">{{ t('stickerTray.pressTitle') }}</h2>
      <p class="mt-1 text-sm text-ink/65">{{ t('stickerTray.pressText') }}</p>

      <div class="relative mx-auto mt-5 aspect-[2/3] w-40 overflow-hidden rounded border-2 border-ink bg-white shadow-xl">
        <img v-if="item" class="h-full w-full object-cover" :src="item.card.image" :alt="item.card.fullName" />
        <button
          v-for="(zone, index) in pressZones"
          :key="index"
          class="absolute flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black shadow transition"
          :class="index < pressedCount ? 'border-mint bg-mint text-ink' : index === pressedCount ? 'border-coral bg-coral text-white ring-4 ring-coral/25' : 'border-white/80 bg-ink/65 text-white'"
          :style="{ left: zone.left, top: zone.top }"
          type="button"
          @click="pressCorner(index)"
        >
          {{ index + 1 }}
        </button>
      </div>
      <p class="mt-3 text-center text-xs font-bold text-ink/55">
        {{ t('stickerTray.pressProgress', { current: pressedCount, total: pressZones.length }) }}
      </p>
    </template>

    <template #footer>
      <Button
        v-if="step > 0"
        :label="t('stickerTray.back')"
        icon="pi pi-arrow-left"
        text
        type="button"
        @click="previousStep"
      />
      <Button
        v-if="step < 2"
        :label="t('stickerTray.continue')"
        icon="pi pi-arrow-right"
        icon-pos="right"
        type="button"
        :disabled="step === 0 ? progress < 90 : alignmentDistance > 14"
        @click="nextStep"
      />
      <Button
        v-else
        :label="t('stickerTray.place')"
        icon="pi pi-check"
        type="button"
        :disabled="pressedCount < pressZones.length"
        @click="completePreparation"
      />
    </template>
  </Dialog>
</template>
