<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

type Position = 'leftBack' | 'center' | 'rightWinger' | 'striker'
type Phase = 'sequence' | 'input' | 'mistake' | 'roundComplete'

interface PositionMeta {
  key: Position
  xPercent: number
  yPercent: number
  fullLabelKey: string
  shortLabelKey: string
}

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()

const POSITIONS: Position[] = ['leftBack', 'center', 'rightWinger', 'striker']
const POSITION_META: PositionMeta[] = [
  {
    key: 'leftBack',
    xPercent: 22,
    yPercent: 80,
    fullLabelKey: 'packHunt.passCombo.leftBackFull',
    shortLabelKey: 'packHunt.passCombo.leftBackShort',
  },
  {
    key: 'center',
    xPercent: 50,
    yPercent: 54,
    fullLabelKey: 'packHunt.passCombo.centerFull',
    shortLabelKey: 'packHunt.passCombo.centerShort',
  },
  {
    key: 'rightWinger',
    xPercent: 80,
    yPercent: 30,
    fullLabelKey: 'packHunt.passCombo.rightWingerFull',
    shortLabelKey: 'packHunt.passCombo.rightWingerShort',
  },
  {
    key: 'striker',
    xPercent: 50,
    yPercent: 12,
    fullLabelKey: 'packHunt.passCombo.strikerFull',
    shortLabelKey: 'packHunt.passCombo.strikerShort',
  },
]

// Раунд 1 → 3 передачи, раунд 2 → 4, раунд 3 → 5 — классический Simon Says:
// комбинация не пересоздаётся с нуля каждый раунд, а растёт на один шаг и
// проигрывается заново целиком.
const roundLengths: number[] = [3, 4, 5]

const highlightOnMs: number = 550
const highlightGapMs: number = 260
const sequenceStartDelayMs: number = 500
const mistakeFlashMs: number = 260
const mistakeReplayDelayMs: number = 900
const roundResultDelayMs: number = 1300
const completionDelayMs: number = 1000
const fastThresholdMs: number = 900

const roundIndex: Ref<number> = ref(0)
const sequence: Ref<Position[]> = ref([])
const phase: Ref<Phase> = ref('sequence')
const highlightIndex: Ref<number | undefined> = ref(undefined)
const inputIndex: Ref<number> = ref(0)
const inputHistory: Ref<Position[]> = ref([])
const mistakeFlashPosition: Ref<Position | undefined> = ref(undefined)
const totalMistakes: Ref<number> = ref(0)
const stepDurations: Ref<number[]> = ref([])
const isComplete: Ref<boolean> = ref(false)

let lastTapTimestamp: number | undefined
let playSequenceTimer: number | undefined
let mistakeFlashTimer: number | undefined
let replayTimer: number | undefined
let resultTimer: number | undefined
let completionTimer: number | undefined

const currentHighlightPosition: ComputedRef<Position | undefined> = computed(
  (): Position | undefined =>
    highlightIndex.value !== undefined ? sequence.value[highlightIndex.value] : undefined,
)

const phaseTranslationKey: ComputedRef<string> = computed((): string => {
  if (isComplete.value) return 'packHunt.passCombo.phaseComplete'
  if (phase.value === 'mistake') return 'packHunt.passCombo.phaseMistake'
  if (phase.value === 'roundComplete') return 'packHunt.passCombo.phaseRoundComplete'
  if (phase.value === 'input') return 'packHunt.passCombo.phaseInput'
  return 'packHunt.passCombo.phaseSequence'
})

const hintTranslationKey: ComputedRef<string> = computed((): string => {
  if (phase.value === 'mistake') return 'packHunt.passCombo.hintMistake'
  if (phase.value === 'roundComplete') return 'packHunt.passCombo.hintRoundComplete'
  if (phase.value === 'input') return 'packHunt.passCombo.hintInput'
  return 'packHunt.passCombo.hintSequence'
})

const averageStepDurationMs: ComputedRef<number> = computed((): number => {
  if (stepDurations.value.length === 0) return 0
  const total: number = stepDurations.value.reduce((sum, value) => sum + value, 0)
  return Math.round(total / stepDurations.value.length)
})

// Простая оценка по трём заявленным критериям: длине пройденной серии (она же
// финальная длина комбинации), числу ошибок и средней скорости повтора.
const starRating: ComputedRef<1 | 2 | 3> = computed((): 1 | 2 | 3 => {
  if (
    totalMistakes.value === 0 &&
    averageStepDurationMs.value > 0 &&
    averageStepDurationMs.value <= fastThresholdMs
  ) {
    return 3
  }
  if (totalMistakes.value <= 2) return 2
  return 1
})

const randomPosition = (): Position => POSITIONS[Math.floor(Math.random() * POSITIONS.length)]!

const registeredOrders = (position: Position): number[] =>
  inputHistory.value.reduce<number[]>((orders, registeredPosition, index): number[] => {
    if (registeredPosition === position) orders.push(index + 1)
    return orders
  }, [])

const extendSequenceForRound = (index: number): void => {
  const targetLength: number = roundLengths[index] ?? roundLengths[roundLengths.length - 1]!
  const next: Position[] = [...sequence.value]
  while (next.length < targetLength) {
    next.push(randomPosition())
  }
  sequence.value = next
}

const playSequenceStep = (step: number): void => {
  if (step >= sequence.value.length) {
    highlightIndex.value = undefined
    phase.value = 'input'
    lastTapTimestamp = undefined
    return
  }
  highlightIndex.value = step
  playSequenceTimer = window.setTimeout((): void => {
    highlightIndex.value = undefined
    playSequenceTimer = window.setTimeout((): void => playSequenceStep(step + 1), highlightGapMs)
  }, highlightOnMs)
}

const initRound = (index: number): void => {
  extendSequenceForRound(index)
  inputIndex.value = 0
  inputHistory.value = []
  phase.value = 'sequence'
  highlightIndex.value = undefined
  playSequenceTimer = window.setTimeout((): void => playSequenceStep(0), sequenceStartDelayMs)
}

const finishRound = (): void => {
  phase.value = 'roundComplete'
  resultTimer = window.setTimeout((): void => {
    if (roundIndex.value + 1 >= roundLengths.length) {
      isComplete.value = true
      completionTimer = window.setTimeout((): void => {
        completionTimer = undefined
        emit('complete')
      }, completionDelayMs)
      return
    }
    roundIndex.value += 1
    initRound(roundIndex.value)
  }, roundResultDelayMs)
}

// Ошибка не проваливает игру: она просто учитывается в оценке, а комбинацию
// (ту же самую, без пересоздания) показывают ещё раз, и попытку можно повторить.
const selectPosition = (position: Position): void => {
  if (phase.value !== 'input') return
  const expected: Position = sequence.value[inputIndex.value]!

  if (position !== expected) {
    totalMistakes.value += 1
    mistakeFlashPosition.value = position
    phase.value = 'mistake'
    mistakeFlashTimer = window.setTimeout((): void => {
      mistakeFlashPosition.value = undefined
    }, mistakeFlashMs)
    replayTimer = window.setTimeout((): void => {
      inputIndex.value = 0
      inputHistory.value = []
      phase.value = 'sequence'
      highlightIndex.value = undefined
      playSequenceTimer = window.setTimeout((): void => playSequenceStep(0), sequenceStartDelayMs)
    }, mistakeReplayDelayMs)
    return
  }

  inputHistory.value = [...inputHistory.value, position]
  const now: number = performance.now()
  if (lastTapTimestamp !== undefined) {
    stepDurations.value = [...stepDurations.value, now - lastTapTimestamp]
  }
  lastTapTimestamp = now
  inputIndex.value += 1

  if (inputIndex.value >= sequence.value.length) finishRound()
}

onMounted((): void => {
  initRound(0)
})

onBeforeUnmount((): void => {
  if (playSequenceTimer !== undefined) window.clearTimeout(playSequenceTimer)
  if (mistakeFlashTimer !== undefined) window.clearTimeout(mistakeFlashTimer)
  if (replayTimer !== undefined) window.clearTimeout(replayTimer)
  if (resultTimer !== undefined) window.clearTimeout(resultTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.passCombo.title')">
    <div class="mb-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-black uppercase tracking-[0.14em] text-ink/50">
          {{ t('packHunt.passCombo.phase') }}
        </span>
        <span class="font-black" :class="phase === 'mistake' ? 'text-red-600' : 'text-coral'">
          {{ t(phaseTranslationKey) }}
        </span>
      </div>
      <div class="flex items-center justify-end gap-1.5">
        <span
          v-for="(length, index) in roundLengths"
          :key="index"
          class="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black"
          :class="
            index < roundIndex || isComplete
              ? 'border-emerald-700 bg-mint text-ink'
              : index === roundIndex
                ? 'border-coral bg-coral text-white ring-2 ring-coral/25'
                : 'border-ink/20 bg-paper text-ink/35'
          "
        >
          {{ index < roundIndex || isComplete ? '✓' : length }}
        </span>
      </div>

      <span class="text-xs font-bold text-ink/55">
        {{ t('packHunt.passCombo.mistakesLabel', { count: totalMistakes }) }}
      </span>
      <div
        class="flex items-center justify-end gap-1"
        :aria-label="t('packHunt.passCombo.inputOrderLabel')"
        aria-live="polite"
      >
        <span
          v-for="step in sequence.length"
          :key="step"
          class="flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-black"
          :class="
            step - 1 < inputIndex
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-ink/15 bg-paper text-ink/30'
          "
        >
          {{ step }}
        </span>
      </div>
    </div>

    <p class="mb-3 text-center text-sm font-bold text-ink/60">{{ t(hintTranslationKey) }}</p>

    <div
      class="relative mx-auto h-[min(65vh,32rem)] min-h-80 w-full max-w-xs overflow-hidden rounded-md border-4 border-ink bg-mint/25"
    >
      <div class="absolute inset-x-6 top-1/2 border-t-2 border-ink/20" aria-hidden="true" />
      <div
        class="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink/20"
        aria-hidden="true"
      />
      <div
        class="absolute inset-x-10 top-2 h-10 border-2 border-t-0 border-ink/20"
        aria-hidden="true"
      />
      <div
        class="absolute inset-x-10 bottom-2 h-10 border-2 border-b-0 border-ink/20"
        aria-hidden="true"
      />

      <button
        v-for="meta in POSITION_META"
        :key="meta.key"
        type="button"
        class="absolute flex h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 transition"
        :style="{ left: `${meta.xPercent}%`, top: `${meta.yPercent}%` }"
        :class="[
          mistakeFlashPosition === meta.key
            ? 'scale-105 border-red-600 bg-red-600 shadow-[0_0_18px_rgb(220_38_38/0.55)]'
            : currentHighlightPosition === meta.key
              ? 'scale-110 border-coral bg-coral shadow-[0_0_18px_rgb(var(--color-coral)/0.6)]'
              : registeredOrders(meta.key).length > 0
                ? 'border-emerald-700 bg-mint shadow-[0_0_14px_rgb(4_120_87/0.35)]'
                : 'border-ink bg-paper',
          phase === 'input' ? 'cursor-pointer hover:scale-105' : 'cursor-default',
        ]"
        :disabled="phase !== 'input'"
        :aria-label="t(meta.fullLabelKey)"
        @click="selectPosition(meta.key)"
      >
        <span
          class="text-sm font-black"
          :class="
            currentHighlightPosition === meta.key || mistakeFlashPosition === meta.key
              ? 'text-paper'
              : 'text-ink'
          "
        >
          {{ t(meta.shortLabelKey) }}
        </span>
        <span
          v-if="registeredOrders(meta.key).length > 0"
          class="mt-1 flex max-w-[3.5rem] flex-wrap justify-center gap-0.5"
          aria-hidden="true"
        >
          <span
            v-for="order in registeredOrders(meta.key)"
            :key="order"
            class="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[9px] font-black leading-none text-white"
          >
            {{ order }}
          </span>
        </span>
      </button>
    </div>

    <div v-if="isComplete" class="mt-4 text-center" aria-live="polite">
      <div class="flex items-center justify-center gap-1">
        <i
          v-for="star in 3"
          :key="star"
          class="pi"
          :class="star <= starRating ? 'pi-star-fill text-gold' : 'pi-star text-ink/20'"
          aria-hidden="true"
        />
      </div>
      <p class="mt-2 text-lg font-black">{{ t('packHunt.passCombo.allRoundsComplete') }}</p>
      <p class="mt-1 text-sm font-bold text-ink/60">
        {{
          t('packHunt.passCombo.summary', {
            length: sequence.length,
            mistakes: totalMistakes,
            speed: averageStepDurationMs,
          })
        }}
      </p>
    </div>
  </section>
</template>
