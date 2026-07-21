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
import gameData from '@/data/mainConst.json'

import ProgressBar from 'primevue/progressbar'

interface RoundConfig {
  boxCount: number
  swapCount: number
  swapDurationMs: number
  feintChance: number
}

interface Move {
  kind: 'swap' | 'feint'
  a: number
  b: number
}

type Phase = 'reveal' | 'shuffling' | 'guessing' | 'result'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()

// Лестница сложности: коробки, число перестановок, скорость анимации и шанс
// ложного движения нарастают от раунда к раунду — это и есть все виды усложнения.
const shellConfig = gameData.packHunt.shell
const roundConfigs: RoundConfig[] = shellConfig.rounds
const {
  revealDurationMs,
  preShuffleDelayMs,
  firstMoveExtraMs,
  resultDelayMs,
  completionDelayMs,
  feintPauseMs,
  feintPeakFraction,
  fieldPaddingPercent,
} = shellConfig

const roundIndex: Ref<number> = ref(0)
const phase: Ref<Phase> = ref('reveal')
const boxOrder: Ref<number[]> = ref([])
const packBoxId: Ref<number> = ref(0)
const selectedBoxId: Ref<number | undefined> = ref(undefined)
const isCorrect: Ref<boolean | undefined> = ref(undefined)
const attemptsThisRound: Ref<number> = ref(0)
const feintBoxIds: Ref<number[]> = ref([])
const shuffleTotalMoves: Ref<number> = ref(0)
const shuffleCompletedMoves: Ref<number> = ref(0)
const activeMoveDurationMs: Ref<number> = ref(roundConfigs[0]!.swapDurationMs)
const isComplete: Ref<boolean> = ref(false)
const elapsedSeconds: Ref<number> = ref(0)

let moveQueue: Move[] = []
let revealTimer: number | undefined
let moveTimer: number | undefined
let resultTimer: number | undefined
let completionTimer: number | undefined
let elapsedInterval: number | undefined

const currentConfig: ComputedRef<RoundConfig> = computed(
  (): RoundConfig => roundConfigs[roundIndex.value] ?? roundConfigs[roundConfigs.length - 1]!,
)
const boxIds: ComputedRef<number[]> = computed((): number[] =>
  Array.from({ length: currentConfig.value.boxCount }, (_, index) => index),
)
// Раскладывает коробки равномерно по ширине поля независимо от их количества.
const slotPositions: ComputedRef<number[]> = computed((): number[] => {
  const boxCount: number = currentConfig.value.boxCount
  if (boxCount <= 1) return [50]
  const step: number = (100 - fieldPaddingPercent * 2) / (boxCount - 1)
  return Array.from({ length: boxCount }, (_, slot): number => fieldPaddingPercent + step * slot)
})
const phaseTranslationKey: ComputedRef<string> = computed((): string => {
  if (isComplete.value) return 'packHunt.shell.phaseComplete'
  if (phase.value === 'result') {
    return isCorrect.value ? 'packHunt.shell.phaseCorrect' : 'packHunt.shell.phaseWrong'
  }
  if (phase.value === 'shuffling') return 'packHunt.shell.phaseShuffling'
  if (phase.value === 'guessing') return 'packHunt.shell.phaseGuessing'
  return 'packHunt.shell.phaseReveal'
})
const hintTranslationKey: ComputedRef<string> = computed((): string => {
  if (phase.value === 'reveal') return 'packHunt.shell.hintReveal'
  if (phase.value === 'shuffling') return 'packHunt.shell.hintShuffling'
  if (phase.value === 'guessing') return 'packHunt.shell.hintGuessing'
  return isCorrect.value ? 'packHunt.shell.hintCorrect' : 'packHunt.shell.hintWrong'
})

const slotOfBox = (boxId: number): number => boxOrder.value.indexOf(boxId)

const boxWrapperStyle = (boxId: number): CSSProperties => ({
  left: `${slotPositions.value[slotOfBox(boxId)] ?? 50}%`,
  transitionDuration: `${activeMoveDurationMs.value}ms`,
})

const shouldShowPack = (boxId: number): boolean =>
  boxId === packBoxId.value && (phase.value === 'reveal' || phase.value === 'result')

const boxIcon = (boxId: number): 'check' | 'cross' | undefined => {
  if (phase.value !== 'result') return undefined
  if (boxId === packBoxId.value) return 'check'
  if (boxId === selectedBoxId.value) return 'cross'
  return undefined
}

// Выбирает две различные позиции для обмена местами.
const createSwapMove = (boxCount: number): Move => {
  const a: number = Math.floor(Math.random() * boxCount)
  let b: number = Math.floor(Math.random() * (boxCount - 1))
  if (b >= a) b += 1
  return { kind: 'swap', a, b }
}

// Перед частью реальных перестановок с заданной вероятностью добавляет ложное
// движение — оно проигрывает ту же анимацию «примерки», но не меняет boxOrder.
const buildMoveQueue = (config: RoundConfig): Move[] => {
  const queue: Move[] = []
  for (let step: number = 0; step < config.swapCount; step += 1) {
    if (Math.random() < config.feintChance) {
      const feint: Move = createSwapMove(config.boxCount)
      queue.push({ kind: 'feint', a: feint.a, b: feint.b })
    }
    queue.push(createSwapMove(config.boxCount))
  }
  return queue
}

// Первый ход раунда всегда идёт медленнее остальных — глаз должен успеть
// переключиться с «запомнил коробку» на «слежу за движением».
const moveDuration = (config: RoundConfig, index: number): number =>
  config.swapDurationMs + (index === 0 ? firstMoveExtraMs : 0)

// Проигрывает очередь ходов один за другим. Ложное движение лишь на мгновение
// подсвечивает две коробки, будто их сейчас поменяют местами, и откатывается назад.
const runNextMove = (config: RoundConfig, index: number): void => {
  if (index >= moveQueue.length) {
    phase.value = 'guessing'
    return
  }
  const move: Move = moveQueue[index]!
  const duration: number = moveDuration(config, index)

  if (move.kind === 'feint') {
    feintBoxIds.value = [boxOrder.value[move.a]!, boxOrder.value[move.b]!]
    moveTimer = window.setTimeout((): void => {
      feintBoxIds.value = []
      shuffleCompletedMoves.value = index + 1
      moveTimer = window.setTimeout((): void => runNextMove(config, index + 1), feintPauseMs)
    }, duration * feintPeakFraction)
    return
  }

  activeMoveDurationMs.value = duration
  const order: number[] = [...boxOrder.value]
  const boxAtA: number = order[move.a]!
  order[move.a] = order[move.b]!
  order[move.b] = boxAtA
  boxOrder.value = order
  moveTimer = window.setTimeout((): void => {
    shuffleCompletedMoves.value = index + 1
    runNextMove(config, index + 1)
  }, duration)
}

// Пак прячется, коробки на секунду замирают закрытыми, и только потом
// начинается первое движение — без этой паузы старт перестановки смазывается
// с моментом исчезновения подсказки, и игрок не успевает перестроить внимание.
const startShuffle = (config: RoundConfig): void => {
  phase.value = 'shuffling'
  moveQueue = buildMoveQueue(config)
  shuffleTotalMoves.value = moveQueue.length
  shuffleCompletedMoves.value = 0
  activeMoveDurationMs.value = config.swapDurationMs
  moveTimer = window.setTimeout((): void => runNextMove(config, 0), preShuffleDelayMs)
}

// Запускает раунд: своя расстановка коробок и новое случайное место пака.
// resetAttempts выключается при повторной попытке того же раунда после промаха,
// чтобы счётчик попыток честно отражал упорство игрока в пределах раунда.
const initRound = (index: number, resetAttempts: boolean): void => {
  const config: RoundConfig = roundConfigs[index] ?? roundConfigs[roundConfigs.length - 1]!
  boxOrder.value = Array.from({ length: config.boxCount }, (_, slot) => slot)
  packBoxId.value = Math.floor(Math.random() * config.boxCount)
  selectedBoxId.value = undefined
  isCorrect.value = undefined
  feintBoxIds.value = []
  phase.value = 'reveal'
  if (resetAttempts) attemptsThisRound.value = 0
  revealTimer = window.setTimeout((): void => startShuffle(config), revealDurationMs)
}

// Промах не проваливает игру целиком — раунд честно пересобирается заново,
// без подсказок и без ускорения по сравнению с прошлой попыткой.
const selectBox = (boxId: number): void => {
  if (phase.value !== 'guessing') return
  selectedBoxId.value = boxId
  isCorrect.value = boxId === packBoxId.value
  attemptsThisRound.value += 1
  phase.value = 'result'

  resultTimer = window.setTimeout((): void => {
    if (!isCorrect.value) {
      initRound(roundIndex.value, false)
      return
    }
    if (roundIndex.value + 1 >= roundConfigs.length) {
      isComplete.value = true
      completionTimer = window.setTimeout((): void => {
        completionTimer = undefined
        emit('complete')
      }, completionDelayMs)
      return
    }
    roundIndex.value += 1
    initRound(roundIndex.value, true)
  }, resultDelayMs)
}

onMounted((): void => {
  initRound(0, true)
  elapsedInterval = window.setInterval((): void => {
    elapsedSeconds.value += 1
  }, 1000)
})

onBeforeUnmount((): void => {
  if (revealTimer !== undefined) window.clearTimeout(revealTimer)
  if (moveTimer !== undefined) window.clearTimeout(moveTimer)
  if (resultTimer !== undefined) window.clearTimeout(resultTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
  if (elapsedInterval !== undefined) window.clearInterval(elapsedInterval)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.shell.title')">
    <!-- Верхняя лента: текущая фаза, лесенка раундов по числу коробок, попытки и время. -->
    <div class="mb-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-black uppercase tracking-[0.14em] text-ink/50">
          {{ t('packHunt.shell.phase') }}
        </span>
        <span
          class="font-black"
          :class="phase === 'result' && !isCorrect ? 'text-red-600' : 'text-coral'"
        >
          {{ t(phaseTranslationKey) }}
        </span>
      </div>
      <div class="flex items-center justify-end gap-1.5">
        <span
          v-for="(config, index) in roundConfigs"
          :key="index"
          class="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black"
          :class="
            index < roundIndex || isComplete
              ? 'border-emerald-700 bg-mint text-ink'
              : index === roundIndex
                ? 'border-coral bg-coral text-white ring-2 ring-coral/25'
                : 'border-ink/20 bg-paper text-ink/35'
          "
          :aria-label="
            t('packHunt.shell.roundBadge', { number: index + 1, boxes: config.boxCount })
          "
        >
          {{ index < roundIndex || isComplete ? '✓' : config.boxCount }}
        </span>
      </div>

      <span class="text-xs font-bold text-ink/55">
        {{ t('packHunt.shell.attemptsLabel', { count: attemptsThisRound }) }}
      </span>
      <span class="justify-self-end text-[10px] font-bold tabular-nums text-ink/45">
        {{ t('packHunt.elapsed', { seconds: elapsedSeconds }) }}
      </span>
    </div>

    <div v-if="phase === 'shuffling'" class="mb-2">
      <ProgressBar
        class="instant-progress h-1.5"
        :value="Math.round((shuffleCompletedMoves / Math.max(1, shuffleTotalMoves)) * 100)"
        :show-value="false"
        :aria-label="t('packHunt.shell.phaseShuffling')"
      />
    </div>

    <!-- Поле с коробками: каждая коробка — кнопка, позиция которой анимированно
         следует за её текущим слотом при перестановках. -->
    <div
      class="relative h-[min(45vh,25rem)] min-h-60 w-full overflow-hidden border-4 border-ink bg-gold/15"
    >
      <div class="absolute inset-x-6 bottom-10 h-1 bg-ink/10" aria-hidden="true" />

      <div
        v-for="boxId in boxIds"
        :key="boxId"
        data-shell-box
        :data-box-id="boxId"
        class="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left] ease-in-out"
        :style="boxWrapperStyle(boxId)"
      >
        <div
          v-if="shouldShowPack(boxId)"
          class="mb-1.5 flex h-9 w-9 -translate-y-1 items-center justify-center rounded-sm border-2 border-ink bg-coral shadow"
          :class="phase === 'reveal' ? 'animate-bounce' : ''"
          aria-hidden="true"
        >
          <span class="text-[8px] font-black uppercase leading-none tracking-wider text-paper">
            {{ t('packHunt.packLabel') }}
          </span>
        </div>

        <button
          type="button"
          class="flex h-24 w-20 touch-manipulation items-center justify-center rounded-sm border-4 border-ink bg-gold/40 shadow-lg transition-transform focus-visible:ring-4 focus-visible:ring-coral/35 sm:h-28 sm:w-24"
          :class="[
            phase === 'guessing'
              ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl'
              : 'cursor-default',
            feintBoxIds.includes(boxId) ? 'shell-feint' : '',
            boxIcon(boxId) === 'check' ? 'ring-4 ring-emerald-700 bg-mint/70' : '',
            boxIcon(boxId) === 'cross' ? 'ring-4 ring-red-600' : '',
          ]"
          :disabled="phase !== 'guessing'"
          :aria-label="t('packHunt.shell.boxLabel', { number: slotOfBox(boxId) + 1 })"
          @click="selectBox(boxId)"
        >
          <i v-if="boxIcon(boxId) === 'check'" class="pi pi-check text-2xl text-emerald-700" />
          <i v-else-if="boxIcon(boxId) === 'cross'" class="pi pi-times text-2xl text-red-600" />
          <span v-else class="text-xl font-black text-ink/70">{{ slotOfBox(boxId) + 1 }}</span>
        </button>
      </div>

      <div
        v-if="isComplete"
        class="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center bg-paper/90 text-center"
        aria-live="polite"
      >
        <i class="pi pi-check-circle animate-pulse text-5xl text-emerald-700" />
        <p class="mt-3 text-xl font-black">{{ t('packHunt.shell.allRoundsComplete') }}</p>
        <p class="mt-1 max-w-xs text-sm font-bold text-ink/60">
          {{ t('packHunt.shell.finishing') }}
        </p>
      </div>
    </div>

    <p class="mt-2 text-center text-xs font-bold text-ink/60">
      {{ t(hintTranslationKey) }}
    </p>
  </section>
</template>

<style scoped>
:deep(.instant-progress .p-progressbar-value) {
  transition: none;
}

.shell-feint {
  animation: shell-feint-bounce 0.32s ease-in-out;
}

@keyframes shell-feint-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px) rotate(-3deg);
  }
}
</style>
