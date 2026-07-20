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

interface Point {
  x: number
  y: number
}

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const fieldPercent: number = 100
const fieldCenter: number = fieldPercent / 2
const fieldRef: Ref<HTMLElement | undefined> = ref(undefined)
const scanner: Ref<Point> = ref({ x: fieldCenter, y: fieldCenter })
const targetRange: number = fieldPercent - gameData.packHunt.targetPaddingPercent * 2
const lockProgress: Ref<number> = ref(0)
const isScannerActive: Ref<boolean> = ref(false)
const isRelocating: Ref<boolean> = ref(false)
const isComplete: Ref<boolean> = ref(false)
const foundSignals: Ref<Point[]> = ref([])
const elapsedSeconds: Ref<number> = ref(0)
const detectionRadius: number = gameData.packHunt.detectionRadiusPercent
let animationFrame: number | undefined
let previousFrame: number = 0
let startedAt: number = 0
let relocationTimer: number | undefined
let completionTimer: number | undefined

const createDistantTarget = (origin: Point): Point => {
  for (let attempt: number = 0; attempt < 40; attempt += 1) {
    const candidate: Point = {
      x: Math.round(gameData.packHunt.targetPaddingPercent + Math.random() * targetRange),
      y: Math.round(gameData.packHunt.targetPaddingPercent + Math.random() * targetRange),
    }
    if (
      Math.hypot(candidate.x - origin.x, candidate.y - origin.y) >=
      gameData.packHunt.minimumTargetDistancePercent
    ) {
      return candidate
    }
  }

  return {
    x:
      origin.x < fieldCenter
        ? fieldPercent - gameData.packHunt.targetPaddingPercent
        : gameData.packHunt.targetPaddingPercent,
    y:
      origin.y < fieldCenter
        ? fieldPercent - gameData.packHunt.targetPaddingPercent
        : gameData.packHunt.targetPaddingPercent,
  }
}

const target: Ref<Point> = ref(createDistantTarget(scanner.value))

const targetDistance: ComputedRef<number> = computed((): number =>
  Math.hypot(scanner.value.x - target.value.x, scanner.value.y - target.value.y),
)
const signalStrength: ComputedRef<number> = computed((): number => {
  if (isRelocating.value) return 0
  if (isComplete.value || targetDistance.value <= detectionRadius) return 4
  if (targetDistance.value <= gameData.packHunt.mediumSignalRadiusPercent) return 3
  if (targetDistance.value <= gameData.packHunt.weakSignalRadiusPercent) return 2
  return 1
})
const signalTranslationKey: ComputedRef<string> = computed((): string => {
  if (isComplete.value) return 'packHunt.signalFound'
  if (isRelocating.value) return 'packHunt.signalRelocating'
  if (signalStrength.value >= 4) return 'packHunt.signalStrong'
  if (signalStrength.value >= 2) return 'packHunt.signalMedium'
  return 'packHunt.signalWeak'
})
const scannerStyle: ComputedRef<CSSProperties> = computed(
  (): CSSProperties => ({ left: `${scanner.value.x}%`, top: `${scanner.value.y}%` }),
)
const targetStyle: ComputedRef<CSSProperties> = computed(
  (): CSSProperties => ({ left: `${target.value.x}%`, top: `${target.value.y}%` }),
)

const clamp = (value: number): number =>
  Math.max(
    gameData.packHunt.scannerPaddingPercent,
    Math.min(fieldPercent - gameData.packHunt.scannerPaddingPercent, value),
  )

// Переводит координаты указателя в проценты игрового поля для мыши и touch-жеста.
const moveScannerToPointer = (event: PointerEvent): void => {
  if (!fieldRef.value || isComplete.value || isRelocating.value) return
  const bounds: DOMRect = fieldRef.value.getBoundingClientRect()
  scanner.value = {
    x: clamp(((event.clientX - bounds.left) / bounds.width) * 100),
    y: clamp(((event.clientY - bounds.top) / bounds.height) * 100),
  }
  isScannerActive.value = true
}

const startScanning = (event: PointerEvent): void => {
  if (isComplete.value || isRelocating.value) return
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  moveScannerToPointer(event)
}

const stopScanning = (event: PointerEvent): void => {
  isScannerActive.value = event.pointerType === 'mouse'
}

const handlePointerEnter = (event: PointerEvent): void => {
  if (event.pointerType === 'mouse' && !isRelocating.value) isScannerActive.value = true
}

const handlePointerLeave = (): void => {
  isScannerActive.value = false
}

// Даёт клавиатуре тот же поиск по направлению, что мыши и пальцу.
const moveScannerWithKeyboard = (event: KeyboardEvent): void => {
  if (
    isComplete.value ||
    isRelocating.value ||
    !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
  ) {
    return
  }
  event.preventDefault()
  const step: number = gameData.packHunt.keyboardStepPercent
  const next: Point = { ...scanner.value }
  if (event.key === 'ArrowUp') next.y -= step
  if (event.key === 'ArrowDown') next.y += step
  if (event.key === 'ArrowLeft') next.x -= step
  if (event.key === 'ArrowRight') next.x += step
  scanner.value = { x: clamp(next.x), y: clamp(next.y) }
  isScannerActive.value = true
}

// После каждой фиксации переносит скрытую точку достаточно далеко от текущего прицела.
const completeSignal = (): void => {
  foundSignals.value = [...foundSignals.value, { ...target.value }]
  isScannerActive.value = false
  lockProgress.value = 100

  if (foundSignals.value.length >= gameData.packHunt.signalsRequired) {
    isComplete.value = true
    animationFrame = undefined
    completionTimer = window.setTimeout((): void => {
      completionTimer = undefined
      emit('complete')
    }, gameData.packHunt.signalCompletionDelayMs)
    return
  }

  isRelocating.value = true
  relocationTimer = window.setTimeout((): void => {
    target.value = createDistantTarget(scanner.value)
    lockProgress.value = 0
    isRelocating.value = false
    previousFrame = 0
    relocationTimer = undefined
  }, gameData.packHunt.signalTransitionMs)
}

// Накапливает фиксацию только внутри найденной зоны и мягко уменьшает её при уходе.
const updateLockProgress = (timestamp: number): void => {
  const elapsed: number = previousFrame === 0 ? 0 : Math.min(64, timestamp - previousFrame)
  previousFrame = timestamp
  elapsedSeconds.value = Math.floor((timestamp - startedAt) / 1000)

  if (isRelocating.value) {
    lockProgress.value = 100
  } else if (isScannerActive.value && targetDistance.value <= detectionRadius) {
    lockProgress.value = Math.min(
      100,
      lockProgress.value + (elapsed / gameData.packHunt.holdDurationMs) * 100,
    )
  } else {
    lockProgress.value = Math.max(
      0,
      lockProgress.value - (elapsed / gameData.packHunt.holdDurationMs) * 35,
    )
  }

  if (lockProgress.value >= 100) {
    completeSignal()
    if (isComplete.value) return
  }

  animationFrame = window.requestAnimationFrame(updateLockProgress)
}

onMounted((): void => {
  startedAt = window.performance.now()
  animationFrame = window.requestAnimationFrame(updateLockProgress)
})

onBeforeUnmount((): void => {
  if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame)
  if (relocationTimer !== undefined) window.clearTimeout(relocationTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.signal.title')">
    <!-- Индикаторы подсказывают направление поиска, не раскрывая точку цели. -->
    <div class="mb-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-black uppercase tracking-[0.14em] text-ink/50">
          {{ t('packHunt.signal') }}
        </span>
        <span class="font-black text-coral">{{ t(signalTranslationKey) }}</span>
      </div>
      <div class="flex items-end justify-end gap-1" aria-hidden="true">
        <span
          v-for="level in 4"
          :key="level"
          class="w-2 border border-ink/20 transition-colors"
          :class="level <= signalStrength ? 'bg-coral' : 'bg-ink/10'"
          :style="{ height: `${8 + level * 5}px` }"
        />
      </div>
      <span class="text-xs font-bold text-ink/55">{{ t('packHunt.locking') }}</span>
      <ProgressBar
        class="instant-progress h-2"
        :value="Math.round(lockProgress)"
        :show-value="false"
        :aria-label="t('packHunt.locking')"
      />
      <span class="text-xs font-bold text-ink/55">
        {{
          t('packHunt.signalsProgress', {
            current: foundSignals.length,
            total: gameData.packHunt.signalsRequired,
          })
        }}
      </span>
      <div class="flex items-center justify-end gap-1.5">
        <span
          v-for="index in gameData.packHunt.signalsRequired"
          :key="index"
          class="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black"
          :class="
            index <= foundSignals.length
              ? 'border-emerald-700 bg-mint text-ink'
              : 'border-ink/20 bg-paper text-ink/35'
          "
        >
          {{ index <= foundSignals.length ? '✓' : index }}
        </span>
        <span class="ml-1 whitespace-nowrap text-[10px] font-bold tabular-nums text-ink/45">
          {{ t('packHunt.elapsed', { seconds: elapsedSeconds }) }}
        </span>
      </div>
    </div>

    <!-- Поле одинаково управляется движением мыши, drag-жестом и стрелками клавиатуры. -->
    <div
      ref="fieldRef"
      class="relative h-[min(45vh,25rem)] min-h-60 w-full touch-none select-none overflow-hidden border-4 border-ink bg-mint outline-none focus-visible:ring-4 focus-visible:ring-coral/35"
      :class="isComplete || isRelocating ? 'cursor-default' : 'cursor-crosshair'"
      role="group"
      tabindex="0"
      :aria-label="t('packHunt.scannerLabel')"
      :aria-valuetext="t(signalTranslationKey)"
      @pointerdown="startScanning"
      @pointermove="moveScannerToPointer"
      @pointerup="stopScanning"
      @pointercancel="stopScanning"
      @pointerenter="handlePointerEnter"
      @pointerleave="handlePointerLeave"
      @keydown="moveScannerWithKeyboard"
    >
      <div class="absolute inset-y-0 left-1/4 w-[12.5%] bg-paper/10" />
      <div class="absolute inset-y-0 left-1/2 w-[12.5%] bg-paper/10" />
      <div class="absolute inset-y-0 left-3/4 w-[12.5%] bg-paper/10" />
      <div class="absolute inset-4 border-2 border-paper/80" />
      <div class="absolute bottom-4 left-1/2 top-4 border-l-2 border-paper/80" />
      <div
        class="absolute left-1/2 top-1/2 aspect-square w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper/80 sm:w-32"
      />

      <div
        v-for="(point, index) in foundSignals"
        :key="`${point.x}-${point.y}`"
        class="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-emerald-800 bg-mint text-xs font-black text-ink shadow"
        :style="{ left: `${point.x}%`, top: `${point.y}%` }"
        aria-hidden="true"
      >
        {{ index + 1 }}
      </div>

      <div
        v-if="isComplete"
        class="absolute z-10 flex h-24 w-16 -translate-x-1/2 -translate-y-1/2 rotate-6 items-center justify-center border-2 border-ink bg-coral shadow-[6px_6px_0_rgb(var(--color-ink)/0.2)]"
        :style="targetStyle"
        :aria-label="t('packHunt.hiddenPack')"
      >
        <span class="-rotate-90 text-xs font-black uppercase tracking-widest text-paper">
          {{ t('packHunt.packLabel') }}
        </span>
      </div>

      <div
        class="pointer-events-none absolute z-20 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-coral bg-paper/20 shadow-[0_0_0_10px_rgb(var(--color-paper)/0.12),0_0_28px_rgb(var(--color-coral)/0.55)] transition-[width,height]"
        :class="[
          signalStrength === 4 ? 'h-16 w-16' : '',
          isRelocating ? 'opacity-35' : '',
        ]"
        :style="scannerStyle"
        aria-hidden="true"
      >
        <span class="absolute left-1/2 top-0 h-full border-l border-coral/70" />
        <span class="absolute left-0 top-1/2 w-full border-t border-coral/70" />
        <span class="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral" />
      </div>
    </div>
  </section>
</template>

<style scoped>
:deep(.instant-progress .p-progressbar-value) {
  transition: none;
}
</style>
