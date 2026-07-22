<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PACK_HUNT_CONFIG } from '@/data/mainConst'

import ProgressBar from 'primevue/progressbar'

type PackKind = 'pack' | 'golden' | 'empty' | 'obstacle'

interface FallingItem {
  id: number
  kind: PackKind
  xPercent: number
  yPercent: number
  fallDurationMs: number
}

interface FloatingLabel {
  id: number
  text: string
  xPercent: number
  tone: 'good' | 'bonus' | 'neutral' | 'bad'
}

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()

const {
  sessionDurationSeconds,
  completionDelayMs,
  catcherWidthPercent,
  catchLinePercent,
  catchBandHalfPercent,
  catchToleranceExtraPercent,
  keyboardMovePercentPerSecond,
  stumbleDurationMs,
  stumbleSpeedMultiplier,
  spawnIntervalStartMs,
  spawnIntervalEndMs,
  fallDurationStartMs,
  fallDurationEndMs,
  fallDurationJitterMin,
  fallDurationJitterMax,
  obstacleWeightStart,
  obstacleWeightEnd,
  goldenWeightStart,
  goldenWeightEnd,
  emptyWeight,
  packScore,
  goldenScore,
  obstacleScore,
  floatingLabelLifetimeMs,
  initialCatcherXPercent,
  initialItemYPercent,
  itemDespawnYPercent,
  maxFrameDeltaMs,
} = PACK_HUNT_CONFIG.catch

const catcherHalfWidthPercent: number = catcherWidthPercent / 2
const catchToleranceHalfWidthPercent: number =
  catcherHalfWidthPercent + catchToleranceExtraPercent
const spawnPaddingPercent: number = catcherHalfWidthPercent

const elapsedMs: Ref<number> = ref(0)
const score: Ref<number> = ref(0)
const catchCounts: Ref<Record<PackKind, number>> = ref({
  pack: 0,
  golden: 0,
  empty: 0,
  obstacle: 0,
})
const fallingItems: Ref<FallingItem[]> = ref([])
const floatingLabels: Ref<FloatingLabel[]> = ref([])
const catcherXPercent: Ref<number> = ref(initialCatcherXPercent)
const isPointerActive: Ref<boolean> = ref(false)
const movingLeft: Ref<boolean> = ref(false)
const movingRight: Ref<boolean> = ref(false)
const stumbleUntilMs: Ref<number> = ref(0)
const isComplete: Ref<boolean> = ref(false)
const fieldRef: Ref<HTMLElement | null> = ref(null)

let rafId: number | undefined
let lastFrameTime: number | undefined
let completionTimer: number | undefined
let labelTimers: number[] = []
let spawnAccumulatorMs: number = 0
let itemSeq: number = 0
let labelSeq: number = 0

const sessionProgress: ComputedRef<number> = computed((): number =>
  Math.min(1, elapsedMs.value / (sessionDurationSeconds * 1000)),
)
const timeRemainingSeconds: ComputedRef<number> = computed((): number =>
  Math.max(0, Math.ceil(sessionDurationSeconds - elapsedMs.value / 1000)),
)
const isStumbling: ComputedRef<boolean> = computed(
  (): boolean => elapsedMs.value < stumbleUntilMs.value,
)
const currentSpawnIntervalMs: ComputedRef<number> = computed((): number =>
  lerp(spawnIntervalStartMs, spawnIntervalEndMs, sessionProgress.value),
)

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, progress))
}

const clampCatcherX = (value: number): number =>
  Math.min(100 - catcherHalfWidthPercent, Math.max(catcherHalfWidthPercent, value))

const isWithinCatchRange = (xPercent: number): boolean =>
  Math.abs(xPercent - catcherXPercent.value) <= catchToleranceHalfWidthPercent

const itemFaceClasses = (kind: PackKind): string => {
  if (kind === 'obstacle') return 'h-7 w-7 rotate-45 border-red-800 bg-red-600'
  if (kind === 'golden')
    return 'h-8 w-8 border-ink bg-gold shadow-[0_0_10px_rgb(var(--color-gold)/0.6)]'
  if (kind === 'empty') return 'h-7 w-7 border-dashed border-ink/40 bg-paper'
  return 'h-8 w-8 border-ink bg-mint/70'
}

const floatingLabelClasses = (tone: FloatingLabel['tone']): string => {
  if (tone === 'bonus') return 'text-gold'
  if (tone === 'bad') return 'text-red-600'
  if (tone === 'neutral') return 'text-ink/40'
  return 'text-emerald-700'
}

const scoreForKind = (kind: PackKind): number => {
  if (kind === 'golden') return goldenScore
  if (kind === 'pack') return packScore
  if (kind === 'obstacle') return obstacleScore
  return 0
}

const labelText = (kind: PackKind, delta: number): string => {
  if (kind === 'empty') return t('packHunt.catch.emptyLabel')
  return delta > 0 ? `+${delta}` : `${delta}`
}

const labelTone = (kind: PackKind): FloatingLabel['tone'] => {
  if (kind === 'golden') return 'bonus'
  if (kind === 'obstacle') return 'bad'
  if (kind === 'empty') return 'neutral'
  return 'good'
}

const pushFloatingLabel = (item: FallingItem, delta: number): void => {
  const id: number = labelSeq++
  floatingLabels.value = [
    ...floatingLabels.value,
    { id, text: labelText(item.kind, delta), xPercent: item.xPercent, tone: labelTone(item.kind) },
  ]
  const timerId: number = window.setTimeout((): void => {
    floatingLabels.value = floatingLabels.value.filter((entry) => entry.id !== id)
    labelTimers = labelTimers.filter((existing) => existing !== timerId)
  }, floatingLabelLifetimeMs)
  labelTimers.push(timerId)
}

// Обычный пак — очко, золотой — бонус, пустая коробка — ничего не даёт и не
// вредит, а препятствие сбивает с ритма: движение клавиатурой замедляется на
// секунду. Ронять непойманное — это нормально, штрафа за пропуск нет.
const resolveCatch = (item: FallingItem): void => {
  catchCounts.value = { ...catchCounts.value, [item.kind]: catchCounts.value[item.kind] + 1 }
  const delta: number = scoreForKind(item.kind)
  score.value = Math.max(0, score.value + delta)
  pushFloatingLabel(item, delta)
  if (item.kind === 'obstacle') {
    stumbleUntilMs.value = elapsedMs.value + stumbleDurationMs
  }
}

const pickKind = (progress: number): PackKind => {
  const obstacleWeight: number = lerp(obstacleWeightStart, obstacleWeightEnd, progress)
  const goldenWeight: number = lerp(goldenWeightStart, goldenWeightEnd, progress)
  const roll: number = Math.random()
  if (roll < obstacleWeight) return 'obstacle'
  if (roll < obstacleWeight + goldenWeight) return 'golden'
  if (roll < obstacleWeight + goldenWeight + emptyWeight) return 'empty'
  return 'pack'
}

const spawnItem = (): void => {
  const progress: number = sessionProgress.value
  const kind: PackKind = pickKind(progress)
  const baseDuration: number = lerp(fallDurationStartMs, fallDurationEndMs, progress)
  const jitter: number =
    fallDurationJitterMin + Math.random() * (fallDurationJitterMax - fallDurationJitterMin)
  fallingItems.value = [
    ...fallingItems.value,
    {
      id: itemSeq++,
      kind,
      xPercent: spawnPaddingPercent + Math.random() * (100 - spawnPaddingPercent * 2),
      yPercent: initialItemYPercent,
      fallDurationMs: baseDuration * jitter,
    },
  ]
}

const maybeSpawnItem = (deltaMs: number): void => {
  spawnAccumulatorMs += deltaMs
  if (spawnAccumulatorMs < currentSpawnIntervalMs.value) return
  spawnAccumulatorMs = 0
  spawnItem()
}

// Ловля проверяется не в один точный кадр, а всё время, пока предмет проходит
// полосу вокруг линии ловли — иначе поймать успевали бы только идеальным таймингом.
const updateFallingItems = (deltaMs: number): void => {
  const remaining: FallingItem[] = []
  for (const item of fallingItems.value) {
    const nextY: number = item.yPercent + (100 / item.fallDurationMs) * deltaMs
    const inCatchBand: boolean = Math.abs(nextY - catchLinePercent) <= catchBandHalfPercent
    if (inCatchBand && isWithinCatchRange(item.xPercent)) {
      resolveCatch(item)
      continue
    }
    if (nextY >= itemDespawnYPercent) continue
    remaining.push({ ...item, yPercent: nextY })
  }
  fallingItems.value = remaining
}

const updateCatcherPosition = (deltaMs: number): void => {
  if (isPointerActive.value) return
  if (!movingLeft.value && !movingRight.value) return
  const speedMultiplier: number = isStumbling.value ? stumbleSpeedMultiplier : 1
  const deltaPercent: number = (keyboardMovePercentPerSecond * speedMultiplier * deltaMs) / 1000
  let next: number = catcherXPercent.value
  if (movingLeft.value) next -= deltaPercent
  if (movingRight.value) next += deltaPercent
  catcherXPercent.value = clampCatcherX(next)
}

const finishSession = (): void => {
  isComplete.value = true
  fallingItems.value = []
  completionTimer = window.setTimeout((): void => {
    completionTimer = undefined
    emit('complete')
  }, completionDelayMs)
}

const advanceSession = (deltaMs: number): void => {
  elapsedMs.value += deltaMs
  if (elapsedMs.value >= sessionDurationSeconds * 1000) finishSession()
}

const tick = (timestamp: number): void => {
  if (lastFrameTime === undefined) lastFrameTime = timestamp
  const deltaMs: number = Math.min(maxFrameDeltaMs, timestamp - lastFrameTime)
  lastFrameTime = timestamp

  if (!isComplete.value) {
    advanceSession(deltaMs)
    updateCatcherPosition(deltaMs)
    updateFallingItems(deltaMs)
    maybeSpawnItem(deltaMs)
  }

  if (!isComplete.value) rafId = window.requestAnimationFrame(tick)
}

const percentFromPointerEvent = (event: PointerEvent, field: HTMLElement): number => {
  const rect: DOMRect = field.getBoundingClientRect()
  return ((event.clientX - rect.left) / rect.width) * 100
}

const onPointerMove = (event: PointerEvent): void => {
  if (!fieldRef.value) return
  catcherXPercent.value = clampCatcherX(percentFromPointerEvent(event, fieldRef.value))
}
const onPointerUp = (): void => {
  isPointerActive.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}
const onPointerDown = (event: PointerEvent): void => {
  if (isComplete.value || !fieldRef.value) return
  isPointerActive.value = true
  catcherXPercent.value = clampCatcherX(percentFromPointerEvent(event, fieldRef.value))
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

const onKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') {
    movingLeft.value = true
    event.preventDefault()
  } else if (event.key === 'ArrowRight') {
    movingRight.value = true
    event.preventDefault()
  }
}
const onKeyUp = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowLeft') movingLeft.value = false
  if (event.key === 'ArrowRight') movingRight.value = false
}
const onFieldBlur = (): void => {
  movingLeft.value = false
  movingRight.value = false
}

onMounted((): void => {
  rafId = window.requestAnimationFrame(tick)
  fieldRef.value?.focus()
})

onBeforeUnmount((): void => {
  if (rafId !== undefined) window.cancelAnimationFrame(rafId)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
  labelTimers.forEach((id) => window.clearTimeout(id))
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
})
</script>

<template>
  <section
    class="w-full"
    :aria-label="t('packHunt.games.catch.title')"
    :style="{ '--floating-label-lifetime': `${floatingLabelLifetimeMs}ms` }"
  >
    <div class="mb-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-black uppercase tracking-[0.14em] text-ink/50">
          {{ t('packHunt.catch.score') }}
        </span>
        <span class="text-xl font-black tabular-nums text-coral">{{ score }}</span>
      </div>
      <div class="flex items-center justify-end gap-3 text-[11px] font-bold text-ink/50">
        <span class="flex items-center gap-1">
          <i class="pi pi-star-fill text-gold" aria-hidden="true" />
          {{ catchCounts.golden }}
        </span>
        <span class="tabular-nums">{{
          t('packHunt.catch.timeLeft', { seconds: timeRemainingSeconds })
        }}</span>
      </div>
    </div>

    <ProgressBar
      class="instant-progress mb-3 h-1.5"
      :value="Math.round((1 - sessionProgress) * 100)"
      :show-value="false"
      :aria-label="t('packHunt.catch.timeLeft', { seconds: timeRemainingSeconds })"
    />

    <div
      ref="fieldRef"
      tabindex="0"
      class="relative h-[min(60vh,30rem)] min-h-72 w-full touch-none overflow-hidden border-4 border-ink bg-gradient-to-b from-paper to-gold/10 outline-none focus-visible:ring-4 focus-visible:ring-coral/30"
      :aria-label="t('packHunt.catch.hint')"
      @pointerdown="onPointerDown"
      @keydown="onKeyDown"
      @keyup="onKeyUp"
      @blur="onFieldBlur"
    >
      <div
        class="absolute inset-x-0 border-t-2 border-dashed border-ink/15"
        :style="{ top: `${catchLinePercent}%` }"
        aria-hidden="true"
      />

      <div
        v-for="item in fallingItems"
        :key="item.id"
        class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm border-2"
        :class="itemFaceClasses(item.kind)"
        :style="{ left: `${item.xPercent}%`, top: `${item.yPercent}%` }"
        aria-hidden="true"
      >
        <i
          v-if="item.kind === 'obstacle'"
          class="pi pi-exclamation-triangle -rotate-45 text-xs text-paper"
        />
        <i v-else-if="item.kind === 'golden'" class="pi pi-star-fill text-xs text-ink" />
        <i v-else-if="item.kind === 'empty'" class="pi pi-inbox text-xs text-ink/40" />
        <span v-else class="text-[8px] font-black uppercase tracking-wider text-paper">
          {{ t('packHunt.packLabel') }}
        </span>
      </div>

      <div
        v-for="label in floatingLabels"
        :key="label.id"
        class="pointer-events-none absolute text-sm font-black float-fade"
        :class="floatingLabelClasses(label.tone)"
        :style="{ left: `${label.xPercent}%`, top: `${catchLinePercent}%` }"
      >
        {{ label.text }}
      </div>

      <div
        class="absolute bottom-3 flex -translate-x-1/2 flex-col items-center"
        :class="isStumbling ? 'catcher-stumble' : ''"
        :style="{ left: `${catcherXPercent}%` }"
      >
        <svg viewBox="0 0 60 74" class="h-16 w-14 drop-shadow" aria-hidden="true">
          <circle cx="30" cy="12" r="9" class="fill-ink" />
          <rect x="18" y="22" width="24" height="26" rx="4" class="fill-ink" />
          <rect x="14" y="26" width="10" height="20" rx="4" class="fill-coral" />
          <rect x="20" y="46" width="8" height="22" rx="3" class="fill-ink/80" />
          <rect x="32" y="46" width="8" height="22" rx="3" class="fill-ink/80" />
          <circle cx="24" cy="70" r="4" class="fill-paper stroke-ink" stroke-width="2" />
          <circle cx="36" cy="70" r="4" class="fill-paper stroke-ink" stroke-width="2" />
        </svg>
      </div>

      <div
        v-if="isComplete"
        class="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-paper/90 text-center"
        aria-live="polite"
      >
        <i class="pi pi-check-circle animate-pulse text-5xl text-emerald-700" />
        <p class="mt-3 text-xl font-black">{{ t('packHunt.catch.sessionComplete') }}</p>
        <p class="mt-1 text-sm font-bold text-ink/60">
          {{ t('packHunt.catch.summary', { score, golden: catchCounts.golden }) }}
        </p>
      </div>
    </div>

    <p class="mt-2 text-center text-xs font-bold text-ink/60">{{ t('packHunt.catch.hint') }}</p>
  </section>
</template>

<style scoped>
:deep(.instant-progress .p-progressbar-value) {
  transition: none;
}

.float-fade {
  animation: float-fade-up var(--floating-label-lifetime) ease-out forwards;
}

@keyframes float-fade-up {
  0% {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -28px);
  }
}

.catcher-stumble {
  animation: catcher-stumble-shake 0.4s ease-in-out;
  filter: saturate(0.6) brightness(0.85);
}

@keyframes catcher-stumble-shake {
  0%,
  100% {
    transform: translateX(-50%);
  }
  25% {
    transform: translateX(calc(-50% - 4px));
  }
  75% {
    transform: translateX(calc(-50% + 4px));
  }
}
</style>
