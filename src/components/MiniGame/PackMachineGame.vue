<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
  type CSSProperties,
  type Ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import gameData from '@/data/mainConst.json'
import {
  createMiniGamePath,
  type MiniGamePoint,
} from '@/utils/createMiniGamePath'

interface DrumOrigin {
  x: number
  width: number
  offset: number
}

type MachineStage = 0 | 1 | 2

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const fieldPercent: number = 100
const machineData = gameData.packHunt.machine
const initialMagnitude: number =
  machineData.drumOffsetMinPercent +
  Math.random() * (machineData.drumOffsetMaxPercent - machineData.drumOffsetMinPercent)
const stage: Ref<MachineStage> = ref(0)
const isTransitioning: Ref<boolean> = ref(false)
const isFinishing: Ref<boolean> = ref(false)
const drumOffset: Ref<number> = ref(Math.random() < 0.5 ? -initialMagnitude : initialMagnitude)
const drumOrigin: Ref<DrumOrigin | undefined> = ref(undefined)
const timingPosition: Ref<number> = ref(0)
const timingMiss: Ref<boolean> = ref(false)
const timingStartedAt: Ref<number> = ref(0)
const deliveryAreaRef: Ref<HTMLElement | undefined> = ref(undefined)
const deliveryPoints: MiniGamePoint[] = createMiniGamePath(machineData.route)
const packPosition: Ref<MiniGamePoint> = ref({ ...deliveryPoints[0]! })
const nextPointIndex: Ref<number> = ref(1)
const isDelivering: Ref<boolean> = ref(false)
const stageTranslationKeys: string[] = [
  'packHunt.machine.drumTitle',
  'packHunt.machine.timingTitle',
  'packHunt.machine.deliveryTitle',
]
let animationFrame: number | undefined
let startedAt: number = 0
let stageTimer: number | undefined
let completionTimer: number | undefined
let lastStopPointerAt: number = Number.NEGATIVE_INFINITY

const drumStyle: ComputedRef<CSSProperties> = computed(
  (): CSSProperties => ({ left: `calc(50% + ${drumOffset.value}%)` }),
)
const isDrumAligned: ComputedRef<boolean> = computed(
  (): boolean => Math.abs(drumOffset.value) <= machineData.drumAlignmentTolerancePercent,
)
const timingTargetStart: number =
  machineData.timingTargetCenterPercent - machineData.timingTargetWidthPercent / 2
const timingTargetEnd: number =
  machineData.timingTargetCenterPercent + machineData.timingTargetWidthPercent / 2
const timingTargetStyle: CSSProperties = {
  left: `${timingTargetStart}%`,
  width: `${machineData.timingTargetWidthPercent}%`,
}
const timingIndicatorStyle: ComputedRef<CSSProperties> = computed(
  (): CSSProperties => ({ left: `${timingPosition.value}%` }),
)
const packStyle: ComputedRef<CSSProperties> = computed(
  (): CSSProperties => ({ left: `${packPosition.value.x}%`, top: `${packPosition.value.y}%` }),
)

const clampPercent = (value: number): number => Math.max(0, Math.min(fieldPercent, value))

const moveToStage = (nextStage: MachineStage): void => {
  if (isTransitioning.value) return
  isTransitioning.value = true
  stageTimer = window.setTimeout((): void => {
    stage.value = nextStage
    if (nextStage === 1) timingStartedAt.value = window.performance.now()
    isTransitioning.value = false
    stageTimer = undefined
  }, machineData.stageTransitionMs)
}

// Сохраняет минимальную длительность раунда после прохождения всех физических этапов.
const finishGame = (): void => {
  if (isFinishing.value) return
  isFinishing.value = true
  const elapsed: number = window.performance.now() - startedAt
  const delay: number = Math.max(0, machineData.minimumDurationMs - elapsed)
  completionTimer = window.setTimeout((): void => {
    completionTimer = undefined
    emit('complete')
  }, delay)
}

// Перемещает блистер вместе с барабаном до центрального окна выдачи.
const startDrum = (event: PointerEvent): void => {
  if (stage.value !== 0 || isTransitioning.value) return
  const width: number = (event.currentTarget as HTMLElement).parentElement?.clientWidth ?? 1
  drumOrigin.value = { x: event.clientX, width, offset: drumOffset.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const moveDrum = (event: PointerEvent): void => {
  if (!drumOrigin.value || stage.value !== 0) return
  const delta: number = ((event.clientX - drumOrigin.value.x) / drumOrigin.value.width) * fieldPercent
  drumOffset.value = Math.max(
    -machineData.drumOffsetMaxPercent,
    Math.min(machineData.drumOffsetMaxPercent, drumOrigin.value.offset + delta),
  )
  if (isDrumAligned.value) {
    drumOffset.value = 0
    drumOrigin.value = undefined
    moveToStage(1)
  }
}

const stopDrum = (): void => {
  drumOrigin.value = undefined
}

const moveDrumWithKeyboard = (event: KeyboardEvent): void => {
  if (stage.value !== 0 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const direction: number = event.key === 'ArrowLeft' ? -1 : 1
  drumOffset.value += direction * gameData.packHunt.keyboardStepPercent
  if (isDrumAligned.value) {
    drumOffset.value = 0
    moveToStage(1)
  }
}

const stopTiming = (): void => {
  if (stage.value !== 1 || isTransitioning.value) return
  const isHit: boolean =
    timingPosition.value >= timingTargetStart && timingPosition.value <= timingTargetEnd
  timingMiss.value = !isHit
  if (isHit) moveToStage(2)
}

// Pointerdown даёт мгновенную реакцию на touch-экране, а временная метка
// отсекает следующий за ним синтетический click без потери клавиатурного управления.
const stopTimingFromPointer = (event: PointerEvent): void => {
  event.preventDefault()
  lastStopPointerAt = window.performance.now()
  stopTiming()
}

const stopTimingFromClick = (): void => {
  if (window.performance.now() - lastStopPointerAt < 700) return
  stopTiming()
}

const checkDeliveryPoint = (): void => {
  const point: MiniGamePoint | undefined = deliveryPoints[nextPointIndex.value]
  if (!point) return
  const distance: number = Math.hypot(packPosition.value.x - point.x, packPosition.value.y - point.y)
  if (distance > machineData.pathTolerancePercent) return
  packPosition.value = { ...point }
  nextPointIndex.value += 1
  if (nextPointIndex.value >= deliveryPoints.length) finishGame()
}

// Проводит блистер по изгибам канала к нижнему лотку автомата.
const moveDelivery = (event: PointerEvent): void => {
  if (!isDelivering.value || !deliveryAreaRef.value || stage.value !== 2) return
  const bounds: DOMRect = deliveryAreaRef.value.getBoundingClientRect()
  packPosition.value = {
    x: clampPercent(((event.clientX - bounds.left) / bounds.width) * fieldPercent),
    y: clampPercent(((event.clientY - bounds.top) / bounds.height) * fieldPercent),
  }
  checkDeliveryPoint()
}

const startDelivery = (event: PointerEvent): void => {
  if (stage.value !== 2 || isFinishing.value) return
  isDelivering.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const stopDelivery = (): void => {
  isDelivering.value = false
}

const moveDeliveryWithKeyboard = (event: KeyboardEvent): void => {
  if (stage.value !== 2 || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    return
  }
  event.preventDefault()
  const step: number = gameData.packHunt.keyboardStepPercent
  const next: MiniGamePoint = { ...packPosition.value }
  if (event.key === 'ArrowUp') next.y -= step
  if (event.key === 'ArrowDown') next.y += step
  if (event.key === 'ArrowLeft') next.x -= step
  if (event.key === 'ArrowRight') next.x += step
  packPosition.value = { x: clampPercent(next.x), y: clampPercent(next.y) }
  checkDeliveryPoint()
}

// Двигает индикатор тайминга по треку с одинаковой скоростью в обе стороны.
const updateTiming = (timestamp: number): void => {
  if (stage.value === 1 && !isTransitioning.value) {
    const cycleProgress: number =
      ((timestamp - timingStartedAt.value) % machineData.timingCycleMs) / machineData.timingCycleMs
    timingPosition.value =
      cycleProgress <= 0.5 ? cycleProgress * 2 * fieldPercent : (2 - cycleProgress * 2) * fieldPercent
  }
  animationFrame = window.requestAnimationFrame(updateTiming)
}

onMounted((): void => {
  startedAt = window.performance.now()
  animationFrame = window.requestAnimationFrame(updateTiming)
})

onBeforeUnmount((): void => {
  if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
  if (stageTimer !== undefined) window.clearTimeout(stageTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.machine.title')">
    <div class="mb-3 grid grid-cols-3 gap-1.5">
      <div
        v-for="index in 3"
        :key="index"
        class="border px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide"
        :class="
          index - 1 === stage
            ? 'border-coral bg-coral text-white'
            : index - 1 < stage
              ? 'border-mint bg-mint text-ink'
              : 'border-ink/10 text-ink/35'
        "
      >
        {{ t(stageTranslationKeys[index - 1] ?? '') }}
      </div>
    </div>

    <!-- Барабан показывает сам блистер и центральное окно, которое нужно совместить. -->
    <div
      v-if="stage === 0"
      class="relative h-[min(45vh,25rem)] min-h-60 overflow-hidden border-4 border-ink bg-ink/10"
    >
      <div
        class="absolute left-1/2 top-1/2 grid h-[72%] min-h-52 w-[78%] max-w-2xl -translate-x-1/2 -translate-y-1/2 grid-cols-5 gap-2 overflow-hidden rounded-[50%] border-4 border-ink bg-gold/25 p-5"
      >
        <span v-for="index in 5" :key="index" class="rounded border-2 border-ink/20 bg-paper/60" />
      </div>
      <div class="pointer-events-none absolute inset-y-6 left-1/2 w-28 -translate-x-1/2 border-4 border-coral bg-paper/10 ring-4 ring-coral/15" />
      <button
        class="absolute top-1/2 z-10 flex h-40 w-28 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center border-2 border-ink bg-coral shadow-xl cursor-grab active:cursor-grabbing"
        :class="isDrumAligned ? 'ring-4 ring-mint' : ''"
        :style="drumStyle"
        type="button"
        data-machine-drum
        :aria-label="t('packHunt.machine.drumTitle')"
        @pointerdown="startDrum"
        @pointermove="moveDrum"
        @pointerup="stopDrum"
        @pointercancel="stopDrum"
        @keydown="moveDrumWithKeyboard"
      >
        <span class="-rotate-90 text-sm font-black uppercase tracking-widest text-paper">
          {{ t('packHunt.packLabel') }}
        </span>
      </button>
      <p class="absolute inset-x-3 bottom-3 bg-paper/90 p-2 text-center text-xs font-bold">
        {{ t('packHunt.machine.drumHint') }}
      </p>
    </div>

    <div
      v-else-if="stage === 1"
      class="flex h-[min(45vh,25rem)] min-h-60 flex-col items-center justify-center border-4 border-ink bg-gold/15 p-6"
    >
      <div class="relative h-20 w-full max-w-xl rounded bg-ink/10 p-2">
        <div class="relative h-full overflow-hidden rounded bg-paper">
          <div
            class="absolute inset-y-1 rounded border-2 border-emerald-700/40 bg-mint"
            :style="timingTargetStyle"
          />
          <div
            class="absolute inset-y-0 w-4 -translate-x-1/2 rounded bg-coral shadow-lg"
            :style="timingIndicatorStyle"
          />
        </div>
      </div>
      <p class="mt-4 text-center text-sm font-bold" :class="timingMiss ? 'text-coral' : 'text-ink/60'">
        {{ timingMiss ? t('packHunt.machine.timingMiss') : t('packHunt.machine.timingHint') }}
      </p>
      <Button
        class="mt-5 touch-manipulation select-none"
        :label="t('packHunt.machine.stop')"
        icon="pi pi-stop-circle"
        type="button"
        data-machine-stop
        @pointerdown="stopTimingFromPointer"
        @click="stopTimingFromClick"
      />
    </div>

    <div v-else class="w-full">
      <div
        ref="deliveryAreaRef"
        class="relative h-[min(41vh,23rem)] min-h-60 overflow-hidden border-4 border-ink bg-ink/5"
      >
        <div
        v-for="(point, index) in deliveryPoints"
        :key="`${index}-${point.x}-${point.y}`"
        data-machine-point
        :data-point-index="index"
        class="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-black"
        :class="
          index < nextPointIndex
            ? 'border-emerald-700 bg-mint text-ink'
            : index === nextPointIndex
              ? 'border-coral bg-coral text-white ring-4 ring-coral/20'
              : 'border-ink/20 bg-paper text-ink/35'
        "
        :style="{ left: `${point.x}%`, top: `${point.y}%` }"
        aria-hidden="true"
      >
        {{ index < nextPointIndex ? '✓' : index + 1 }}
        </div>
        <button
        class="absolute z-10 flex h-24 w-16 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center border-2 border-ink bg-coral shadow-lg cursor-grab active:cursor-grabbing"
        :class="isFinishing ? 'opacity-40' : ''"
        :style="packStyle"
        type="button"
        data-machine-pack
        :aria-label="t('packHunt.machine.deliveryTitle')"
        @pointerdown="startDelivery"
        @pointermove="moveDelivery"
        @pointerup="stopDelivery"
        @pointercancel="stopDelivery"
        @keydown="moveDeliveryWithKeyboard"
      >
        <span class="-rotate-90 text-[10px] font-black uppercase tracking-wider text-paper">
          {{ t('packHunt.packLabel') }}
        </span>
        </button>
        <div
        v-if="isFinishing"
        class="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-paper/90 text-center"
        aria-live="polite"
      >
        <i class="pi pi-check-circle animate-pulse text-5xl text-emerald-700" />
        <p class="mt-3 text-xl font-black">{{ t('packHunt.machine.routeComplete') }}</p>
        <p class="mt-1 max-w-xs text-sm font-bold text-ink/60">
          {{ t('packHunt.machine.finishing') }}
        </p>
        </div>
      </div>
      <p class="mt-2 text-center text-xs font-bold text-ink/60">
        {{ t('packHunt.machine.deliveryHint') }}
      </p>
    </div>
  </section>
</template>
