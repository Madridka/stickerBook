<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
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

interface PeelOrigin {
  x: number
  position: number
  trackWidth: number
}

type PeelResult = 'playing' | 'success' | 'failure'

interface PressZone {
  className: string
}

const pressZonePositions: PressZone[] = [
  { className: 'left-[8%] top-[8%]' },
  { className: 'left-[72%] top-[8%]' },
  { className: 'left-[72%] top-[76%]' },
  { className: 'left-[8%] top-[76%]' },
]

const shufflePressZones = (): PressZone[] => {
  const zones: PressZone[] = [...pressZonePositions]

  for (let index: number = zones.length - 1; index > 0; index -= 1) {
    const randomIndex: number = Math.floor(Math.random() * (index + 1))
    ;[zones[index], zones[randomIndex]] = [zones[randomIndex]!, zones[index]!]
  }

  return zones
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const step: Ref<number> = ref(0)
const peelPosition: Ref<number> = ref(12)
const peelTargetPosition: Ref<number> = ref(70)
const peelTargetDuration: Ref<number> = ref(900)
const peelResult: Ref<PeelResult> = ref('playing')
const peelOrigin: Ref<PeelOrigin | undefined> = ref(undefined)
const peelTrackRef: Ref<HTMLElement | undefined> = ref(undefined)
const peelTargetRef: Ref<HTMLElement | undefined> = ref(undefined)
const peelHandleRef: Ref<HTMLElement | undefined> = ref(undefined)
const alignX: Ref<number> = ref(38)
const alignY: Ref<number> = ref(-30)
const alignOrigin: Ref<PointerOrigin | undefined> = ref(undefined)
const pressedCount: Ref<number> = ref(0)
const pressMistakes: Ref<number> = ref(0)
const pressZones: Ref<PressZone[]> = ref(shufflePressZones())
const alignmentOffset: ComputedRef<number> = computed((): number =>
  Math.hypot(alignX.value, alignY.value),
)
const alignmentDistance: ComputedRef<number> = computed((): number =>
  Math.round(alignmentOffset.value),
)
const alignmentAccuracy: ComputedRef<number> = computed((): number =>
  Math.min(100, Math.max(0, 101 - Math.round(alignmentOffset.value / 2))),
)
const stepTranslationKeys: string[] = [
  'stickerTray.stepPeel',
  'stickerTray.stepAlign',
  'stickerTray.stepPress',
]
const alignmentCardWidth: number = 112
const alignmentCardHeight: number = 168
const alignmentPerfectAccuracy: number = 95
const alignmentMaxX: number = 128
const alignmentMaxY: number = 144
let peelTimer: ReturnType<typeof setTimeout> | undefined

const clearPeelTimer = (): void => {
  if (peelTimer) clearTimeout(peelTimer)
  peelTimer = undefined
}

const randomBetween = (min: number, max: number): number =>
  Math.round(min + Math.random() * (max - min))

const movePeelTarget = (): void => {
  if (!props.visible || step.value !== 0 || peelResult.value !== 'playing') return
  peelTargetDuration.value = randomBetween(650, 1250)
  peelTargetPosition.value = randomBetween(22, 78)
  peelTimer = setTimeout(movePeelTarget, peelTargetDuration.value + randomBetween(180, 520))
}

const resetPeel = (): void => {
  clearPeelTimer()
  peelPosition.value = 12
  peelTargetPosition.value = randomBetween(38, 72)
  peelTargetDuration.value = 0
  peelResult.value = 'playing'
  peelOrigin.value = undefined
  peelTimer = setTimeout(movePeelTarget, 180)
}

watch(
  (): boolean => props.visible,
  (visible: boolean): void => {
    if (!visible) {
      clearPeelTimer()
      return
    }
    step.value = 0
    resetPeel()
    alignX.value = 38
    alignY.value = -30
    alignOrigin.value = undefined
    pressedCount.value = 0
    pressMistakes.value = 0
    pressZones.value = shufflePressZones()
  },
)

watch(step, (currentStep: number): void => {
  if (currentStep === 0 && props.visible && peelResult.value === 'playing') {
    clearPeelTimer()
    peelTimer = setTimeout(movePeelTarget, 180)
    return
  }
  clearPeelTimer()
})

const updateVisible = (visible: boolean): void => emit('update:visible', visible)

const startPeel = (event: PointerEvent): void => {
  if (peelResult.value !== 'playing' || !peelTrackRef.value) return
  peelOrigin.value = {
    x: event.clientX,
    position: peelPosition.value,
    trackWidth: peelTrackRef.value.getBoundingClientRect().width,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// Ведёт ползунок за указателем, пока движущаяся зона успеха меняет ритм независимо от игрока.
const movePeel = (event: PointerEvent): void => {
  if (!peelOrigin.value) return
  const delta: number = ((event.clientX - peelOrigin.value.x) / peelOrigin.value.trackWidth) * 100
  peelPosition.value = Math.max(7, Math.min(93, peelOrigin.value.position + delta))
}

const finishPeel = (): void => {
  if (!peelOrigin.value) return
  peelOrigin.value = undefined

  const trackBounds: DOMRect | undefined = peelTrackRef.value?.getBoundingClientRect()
  const targetBounds: DOMRect | undefined = peelTargetRef.value?.getBoundingClientRect()
  const handleBounds: DOMRect | undefined = peelHandleRef.value?.getBoundingClientRect()
  if (!trackBounds || !targetBounds || !handleBounds) return

  const handleCenter: number = handleBounds.left + handleBounds.width / 2
  const isHit: boolean = handleCenter >= targetBounds.left && handleCenter <= targetBounds.right
  peelResult.value = isHit ? 'success' : 'failure'
  clearPeelTimer()

  if (isHit) {
    const targetCenter: number = targetBounds.left + targetBounds.width / 2
    peelPosition.value = ((targetCenter - trackBounds.left) / trackBounds.width) * 100
  }
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
  alignX.value = Math.max(
    -alignmentMaxX,
    Math.min(alignmentMaxX, alignOrigin.value.offsetX + event.clientX - alignOrigin.value.x),
  )
  alignY.value = Math.max(
    -alignmentMaxY,
    Math.min(alignmentMaxY, alignOrigin.value.offsetY + event.clientY - alignOrigin.value.y),
  )
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
  if (step.value === 0 && peelResult.value !== 'success') return
  step.value = Math.min(2, step.value + 1)
}

const previousStep = (): void => {
  step.value = Math.max(0, step.value - 1)
}

// Объединяет качество снятия, совмещения и разглаживания в итог экземпляра.
const completePreparation = (): void => {
  if (!props.item || pressedCount.value < pressZones.value.length) return
  const peelQuality: number = 100
  const alignmentQuality: number = alignmentAccuracy.value
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

onBeforeUnmount(clearPeelTimer)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    class="w-[min(34rem,calc(100vw-1.5rem))]"
    :header="t('stickerTray.peelTitle')"
    @update:visible="updateVisible"
    @hide="handleHide"
    pt:header:class="!pb-0 max-md:!px-3 max-md:!pt-3"
    pt:content:class="max-md:!px-3 max-md:!pb-1"
    pt:footer:class="max-md:!px-3 max-md:!pb-2 max-md:!pt-1"
  >
    <div class="mb-3 grid grid-cols-3 gap-2 max-md:mb-1.5 max-md:gap-1">
      <div
        v-for="index in 3"
        :key="index"
        class="rounded border px-2 py-2 text-center text-[10px] font-black uppercase tracking-wide max-md:py-1"
        :class="
          index - 1 === step
            ? 'border-coral bg-coral text-white'
            : index - 1 < step
              ? 'border-mint bg-mint text-ink'
              : 'border-ink/10 text-ink/40'
        "
      >
        {{ t(stepTranslationKeys[index - 1] ?? '') }}
      </div>
    </div>

    <p class="text-[10px] font-black uppercase tracking-[0.16em] text-coral">
      {{ t('stickerTray.stepLabel', { current: step + 1, total: 3 }) }}
    </p>

    <template v-if="step === 0">
      <h2 class="mt-0.5 text-lg font-black">{{ t('stickerTray.stepPeel') }}</h2>
      <p class="mt-0.5 text-xs leading-snug text-ink/60">{{ t('stickerTray.peelText') }}</p>

      <div class="mt-3 [perspective:900px]">
        <div
          class="relative mx-auto aspect-[2/3] w-28 overflow-hidden rounded border-2 border-ink bg-[#ece8dd] shadow-lg [transform:rotateY(180deg)]"
        >
          <img
            v-if="item"
            class="absolute inset-0 h-full w-full scale-x-[-1] object-cover opacity-20"
            :src="item.card.image"
            alt=""
          />
          <div class="absolute inset-2 rounded border border-dashed border-ink/25 bg-white/75" />
          <span
            class="absolute inset-x-0 top-1/2 -translate-y-1/2 scale-x-[-1] text-center text-[10px] font-black uppercase tracking-widest text-ink/45"
          >
            {{ t('stickerTray.protectiveLayer') }}
          </span>
        </div>
      </div>

      <div class="mt-3 rounded bg-ink/10 p-1">
        <div ref="peelTrackRef" class="relative h-14 overflow-hidden rounded bg-paper">
          <div
            ref="peelTargetRef"
            class="pointer-events-none absolute inset-y-1 w-[38%] rounded border-2 border-emerald-700/50 bg-mint/80 shadow-[0_0_18px_rgb(var(--color-mint)/0.75)] transition-[left] ease-linear"
            :style="{
              left: `calc(${peelTargetPosition}% - 19%)`,
              transitionDuration: `${peelTargetDuration}ms`,
            }"
          />
          <div
            class="pointer-events-none absolute inset-x-3 top-1/2 border-t-2 border-dashed border-ink/30"
          />
          <button
            ref="peelHandleRef"
            class="absolute inset-y-1 z-10 w-12 -translate-x-1/2 touch-none cursor-grab rounded bg-coral text-sm font-black text-white shadow active:cursor-grabbing disabled:cursor-default"
            :class="{
              '!bg-emerald-700': peelResult === 'success',
              '!bg-red-600': peelResult === 'failure',
            }"
            :style="{ left: `${peelPosition}%` }"
            type="button"
            :aria-label="t('stickerTray.protectiveLayer')"
            :disabled="peelResult !== 'playing'"
            @pointerdown="startPeel"
            @pointermove="movePeel"
            @pointerup="finishPeel"
            @pointercancel="finishPeel"
          >
            ↔
          </button>
        </div>
      </div>
      <p
        class="mt-2 text-center text-xs font-bold"
        :class="{
          'text-ink/55': peelResult === 'playing',
          'text-emerald-700': peelResult === 'success',
          'text-red-600': peelResult === 'failure',
        }"
      >
        {{
          t(
            peelResult === 'success'
              ? 'stickerTray.peelSuccess'
              : peelResult === 'failure'
                ? 'stickerTray.peelMiss'
                : 'stickerTray.peelTimingHint',
          )
        }}
      </p>
      <div v-if="peelResult === 'failure'" class="mt-3 text-center">
        <Button
          :label="t('stickerTray.retry')"
          icon="pi pi-refresh"
          severity="secondary"
          type="button"
          @click="resetPeel"
        />
      </div>
    </template>

    <template v-else-if="step === 1">
      <h2 class="mt-0.5 text-lg font-black">{{ t('stickerTray.alignTitle') }}</h2>
      <p class="mt-0.5 text-xs leading-snug text-ink/60">
        {{ t('stickerTray.alignText') }}
      </p>

      <div
        class="relative mx-auto mt-5 h-72 w-64 overflow-hidden rounded-lg bg-ink/10 shadow-inner max-md:mt-2 max-md:h-64"
      >
        <div
          class="absolute left-1/2 top-1/2 aspect-[2/3] w-28 -translate-x-1/2 -translate-y-1/2 rounded border-2 border-dashed border-coral bg-paper/55"
        />
        <button
          class="absolute left-1/2 top-1/2 aspect-[2/3] w-28 touch-none select-none overflow-hidden rounded border-2 border-ink bg-white shadow-xl cursor-grab active:cursor-grabbing"
          :class="alignmentAccuracy > alignmentPerfectAccuracy ? 'ring-4 ring-mint' : ''"
          :style="{ transform: `translate(calc(-50% + ${alignX}px), calc(-50% + ${alignY}px))` }"
          type="button"
          :aria-label="t('stickerTray.alignTitle')"
          @pointerdown="startAlignment"
          @pointermove="moveAlignment"
          @pointerup="finishAlignment"
          @pointercancel="finishAlignment"
        >
          <img
            v-if="item"
            class="pointer-events-none h-full w-full select-none object-cover"
            :src="item.card.image"
            :alt="item.card.fullName"
            draggable="false"
          />
        </button>
      </div>
      <p
        class="mt-3 text-center text-xs font-black max-md:mt-2"
        :class="alignmentAccuracy > alignmentPerfectAccuracy ? 'text-emerald-700' : 'text-ink/55'"
      >
        {{
          alignmentAccuracy > alignmentPerfectAccuracy
            ? t('stickerTray.alignmentReady', { accuracy: alignmentAccuracy })
            : t('stickerTray.alignment', {
                accuracy: alignmentAccuracy,
                distance: alignmentDistance,
              })
        }}
      </p>
    </template>

    <template v-else>
      <h2 class="mt-0.5 text-lg font-black">{{ t('stickerTray.pressTitle') }}</h2>
      <p class="mt-0.5 text-xs leading-snug text-ink/60">{{ t('stickerTray.pressText') }}</p>

      <div
        class="relative mx-auto mt-3 aspect-[2/3] w-40 overflow-hidden rounded border-2 border-ink bg-white shadow-xl"
      >
        <img
          v-if="item"
          class="h-full w-full object-cover"
          :src="item.card.image"
          :alt="item.card.fullName"
        />
        <button
          v-for="(zone, index) in pressZones"
          :key="index"
          class="absolute flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black shadow transition"
          :class="[
            zone.className,
            index < pressedCount
              ? 'border-mint bg-mint text-ink'
              : index === pressedCount
                ? 'border-coral bg-coral text-white ring-4 ring-coral/25'
                : 'border-white/80 bg-ink/65 text-white',
          ]"
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
        :disabled="step === 0 && peelResult !== 'success'"
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
