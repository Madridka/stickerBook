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
import ProgressBar from 'primevue/progressbar'
import gameData from '@/data/mainConst.json'
import {
  createMiniGamePath,
  type MiniGamePoint,
} from '@/utils/createMiniGamePath'

interface SpreadOrigin {
  x: number
  width: number
  offset: number
}

type RackSide = 'left' | 'right'
type RackStage = 0 | 1 | 2

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const fieldPercent: number = 100
const stage: Ref<RackStage> = ref(0)
const isTransitioning: Ref<boolean> = ref(false)
const isFinishing: Ref<boolean> = ref(false)
const leftSpread: Ref<number> = ref(0)
const rightSpread: Ref<number> = ref(0)
const leftOrigin: Ref<SpreadOrigin | undefined> = ref(undefined)
const rightOrigin: Ref<SpreadOrigin | undefined> = ref(undefined)
const isGripping: Ref<boolean> = ref(false)
const gripProgress: Ref<number> = ref(0)
const extractionAreaRef: Ref<HTMLElement | undefined> = ref(undefined)
const extractionPoints: MiniGamePoint[] = createMiniGamePath(gameData.packHunt.rack.route)
const packPosition: Ref<MiniGamePoint> = ref({ ...extractionPoints[0]! })
const nextPointIndex: Ref<number> = ref(1)
const isExtracting: Ref<boolean> = ref(false)
const stageTranslationKeys: string[] = [
  'packHunt.rack.spreadTitle',
  'packHunt.rack.gripTitle',
  'packHunt.rack.extractTitle',
]
let animationFrame: number | undefined
let previousFrame: number = 0
let startedAt: number = 0
let stageTimer: number | undefined
let completionTimer: number | undefined

const spreadTarget: number = gameData.packHunt.rack.spreadTargetPercent
const isSpreadComplete: ComputedRef<boolean> = computed(
  (): boolean => leftSpread.value <= -spreadTarget && rightSpread.value >= spreadTarget,
)
const leftStackStyle: ComputedRef<CSSProperties> = computed((): CSSProperties => ({
  left: `${50 - gameData.packHunt.rack.stackSeparationPercent + leftSpread.value}%`,
}))
const rightStackStyle: ComputedRef<CSSProperties> = computed((): CSSProperties => ({
  left: `${50 + gameData.packHunt.rack.stackSeparationPercent + rightSpread.value}%`,
}))
const packStyle: ComputedRef<CSSProperties> = computed((): CSSProperties => ({
  left: `${packPosition.value.x}%`,
  top: `${packPosition.value.y}%`,
}))

const clampPercent = (value: number): number => Math.max(0, Math.min(fieldPercent, value))

const moveToStage = (nextStage: RackStage): void => {
  if (isTransitioning.value) return
  isTransitioning.value = true
  stageTimer = window.setTimeout((): void => {
    stage.value = nextStage
    isTransitioning.value = false
    stageTimer = undefined
  }, gameData.packHunt.rack.stageTransitionMs)
}

// Завершает раунд не раньше общей минимальной длительности, сохраняя финальную анимацию.
const finishGame = (): void => {
  if (isFinishing.value) return
  isFinishing.value = true
  const elapsed: number = window.performance.now() - startedAt
  const delay: number = Math.max(0, gameData.packHunt.rack.minimumDurationMs - elapsed)
  completionTimer = window.setTimeout((): void => {
    completionTimer = undefined
    emit('complete')
  }, delay)
}

// Раздвигает левую и правую стопки независимо друг от друга.
const startSpread = (event: PointerEvent, side: RackSide): void => {
  if (stage.value !== 0 || isTransitioning.value) return
  const width: number = (event.currentTarget as HTMLElement).parentElement?.clientWidth ?? 1
  const origin: SpreadOrigin = {
    x: event.clientX,
    width,
    offset: side === 'left' ? leftSpread.value : rightSpread.value,
  }
  if (side === 'left') leftOrigin.value = origin
  else rightOrigin.value = origin
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const moveSpread = (event: PointerEvent, side: RackSide): void => {
  const origin: SpreadOrigin | undefined = side === 'left' ? leftOrigin.value : rightOrigin.value
  if (!origin || stage.value !== 0) return
  const delta: number = ((event.clientX - origin.x) / origin.width) * fieldPercent
  if (side === 'left') leftSpread.value = Math.max(-spreadTarget, Math.min(0, origin.offset + delta))
  else rightSpread.value = Math.min(spreadTarget, Math.max(0, origin.offset + delta))
  if (isSpreadComplete.value) moveToStage(1)
}

const stopSpread = (side: RackSide): void => {
  if (side === 'left') leftOrigin.value = undefined
  else rightOrigin.value = undefined
}

const spreadWithKeyboard = (event: KeyboardEvent, side: RackSide): void => {
  const expectedKey: string = side === 'left' ? 'ArrowLeft' : 'ArrowRight'
  if (event.key !== expectedKey || stage.value !== 0) return
  event.preventDefault()
  const step: number = gameData.packHunt.keyboardStepPercent
  if (side === 'left') leftSpread.value = Math.max(-spreadTarget, leftSpread.value - step)
  else rightSpread.value = Math.min(spreadTarget, rightSpread.value + step)
  if (isSpreadComplete.value) moveToStage(1)
}

const startGrip = (event: PointerEvent): void => {
  if (stage.value !== 1 || isTransitioning.value) return
  isGripping.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const stopGrip = (): void => {
  isGripping.value = false
}

const handleGripKey = (event: KeyboardEvent, active: boolean): void => {
  if (event.code !== 'Space' || stage.value !== 1) return
  event.preventDefault()
  isGripping.value = active
}

const checkExtractionPoint = (): void => {
  const point: MiniGamePoint | undefined = extractionPoints[nextPointIndex.value]
  if (!point) return
  const distance: number = Math.hypot(packPosition.value.x - point.x, packPosition.value.y - point.y)
  if (distance > gameData.packHunt.rack.pathTolerancePercent) return
  packPosition.value = { ...point }
  nextPointIndex.value += 1
  if (nextPointIndex.value >= extractionPoints.length) finishGame()
}

// Ведёт блистер через последовательные контрольные точки безопасной траектории.
const moveExtraction = (event: PointerEvent): void => {
  if (!isExtracting.value || !extractionAreaRef.value || stage.value !== 2) return
  const bounds: DOMRect = extractionAreaRef.value.getBoundingClientRect()
  packPosition.value = {
    x: clampPercent(((event.clientX - bounds.left) / bounds.width) * fieldPercent),
    y: clampPercent(((event.clientY - bounds.top) / bounds.height) * fieldPercent),
  }
  checkExtractionPoint()
}

const startExtraction = (event: PointerEvent): void => {
  if (stage.value !== 2 || isFinishing.value) return
  isExtracting.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const stopExtraction = (): void => {
  isExtracting.value = false
}

const moveExtractionWithKeyboard = (event: KeyboardEvent): void => {
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
  checkExtractionPoint()
}

// Обновляет удержание уголка блистера независимо от частоты кадров.
const updateGrip = (timestamp: number): void => {
  const elapsed: number = previousFrame === 0 ? 0 : Math.min(64, timestamp - previousFrame)
  previousFrame = timestamp
  if (stage.value === 1 && isGripping.value && !isTransitioning.value) {
    gripProgress.value = Math.min(
      100,
      gripProgress.value + (elapsed / gameData.packHunt.rack.gripDurationMs) * 100,
    )
  } else if (stage.value === 1) {
    gripProgress.value = Math.max(
      0,
      gripProgress.value - (elapsed / gameData.packHunt.rack.gripDurationMs) * 30,
    )
  }
  if (gripProgress.value >= 100 && stage.value === 1) {
    isGripping.value = false
    moveToStage(2)
  }
  animationFrame = window.requestAnimationFrame(updateGrip)
}

onMounted((): void => {
  startedAt = window.performance.now()
  animationFrame = window.requestAnimationFrame(updateGrip)
})

onBeforeUnmount((): void => {
  if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
  if (stageTimer !== undefined) window.clearTimeout(stageTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.rack.title')">
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

    <!-- Каждый этап использует прямое действие с физическим предметом. -->
    <div
      v-if="stage === 0"
      class="relative h-[min(45vh,25rem)] min-h-60 overflow-hidden border-4 border-ink bg-gold/20"
    >
      <div
        class="absolute left-1/2 top-1/2 flex h-52 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 border-ink bg-coral shadow-lg"
      >
        <span class="-rotate-90 text-sm font-black uppercase tracking-widest text-paper">
          {{ t('packHunt.packLabel') }}
        </span>
      </div>
      <button
        class="absolute top-1/2 z-10 flex h-[82%] w-[42%] -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center border-2 border-ink bg-paper shadow-xl"
        :style="leftStackStyle"
        data-rack-side="left"
        type="button"
        @pointerdown="startSpread($event, 'left')"
        @pointermove="moveSpread($event, 'left')"
        @pointerup="stopSpread('left')"
        @pointercancel="stopSpread('left')"
        @keydown="spreadWithKeyboard($event, 'left')"
      >
        <span class="absolute left-2 top-1/2 flex h-10 w-8 -translate-y-1/2 items-center justify-center bg-ink text-xl text-paper">
          ←
        </span>
        <span class="-rotate-6 text-center font-black uppercase text-ink/65">
          {{ t('packHunt.rack.magazineLabel', { number: 1 }) }}
        </span>
      </button>
      <button
        class="absolute top-1/2 z-20 flex h-[78%] w-[42%] -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center border-2 border-ink bg-mint shadow-xl"
        :style="rightStackStyle"
        data-rack-side="right"
        type="button"
        @pointerdown="startSpread($event, 'right')"
        @pointermove="moveSpread($event, 'right')"
        @pointerup="stopSpread('right')"
        @pointercancel="stopSpread('right')"
        @keydown="spreadWithKeyboard($event, 'right')"
      >
        <span class="absolute right-2 top-1/2 flex h-10 w-8 -translate-y-1/2 items-center justify-center bg-ink text-xl text-paper">
          →
        </span>
        <span class="rotate-6 text-center font-black uppercase text-ink/65">
          {{ t('packHunt.rack.magazineLabel', { number: 2 }) }}
        </span>
      </button>
      <p class="absolute inset-x-3 bottom-3 z-30 bg-paper/90 p-2 text-center text-xs font-bold">
        {{ t('packHunt.rack.spreadHint') }}
      </p>
    </div>

    <div
      v-else-if="stage === 1"
      class="relative flex h-[min(45vh,25rem)] min-h-60 flex-col items-center justify-center overflow-hidden border-4 border-ink bg-gold/15"
    >
      <div class="relative flex h-60 w-40 items-center justify-center border-2 border-ink bg-coral shadow-xl">
        <span class="-rotate-90 text-lg font-black uppercase tracking-widest text-paper">
          {{ t('packHunt.packLabel') }}
        </span>
        <button
          class="absolute -right-3 -top-3 flex h-16 w-16 touch-none items-center justify-center rounded-full border-4 border-paper bg-ink text-2xl text-paper shadow-lg focus-visible:ring-4 focus-visible:ring-coral/35"
          type="button"
          data-rack-grip
          :aria-label="t('packHunt.rack.gripCorner')"
          @pointerdown="startGrip"
          @pointerup="stopGrip"
          @pointercancel="stopGrip"
          @keydown="handleGripKey($event, true)"
          @keyup="handleGripKey($event, false)"
        >
          <i class="pi pi-hand-paper" />
        </button>
      </div>
      <div class="mt-5 w-[min(20rem,80%)]">
        <ProgressBar
          :value="Math.round(gripProgress)"
          :show-value="false"
          class="instant-progress h-3"
        />
        <p class="mt-2 text-center text-xs font-bold text-ink/60">
          {{ t('packHunt.rack.gripHint') }}
        </p>
      </div>
    </div>

    <div v-else class="w-full">
      <div
        ref="extractionAreaRef"
        class="relative h-[min(41vh,23rem)] min-h-60 overflow-hidden border-4 border-ink bg-ink/5"
      >
        <div
        v-for="(point, index) in extractionPoints"
        :key="`${index}-${point.x}-${point.y}`"
        data-rack-point
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
        data-rack-pack
        :aria-label="t('packHunt.rack.extractTitle')"
        @pointerdown="startExtraction"
        @pointermove="moveExtraction"
        @pointerup="stopExtraction"
        @pointercancel="stopExtraction"
        @keydown="moveExtractionWithKeyboard"
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
        <p class="mt-3 text-xl font-black">{{ t('packHunt.rack.routeComplete') }}</p>
        <p class="mt-1 max-w-xs text-sm font-bold text-ink/60">
          {{ t('packHunt.rack.finishing') }}
        </p>
        </div>
      </div>
      <p class="mt-2 text-center text-xs font-bold text-ink/60">
        {{ t('packHunt.rack.extractHint') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
:deep(.instant-progress .p-progressbar-value) {
  transition: none;
}
</style>
