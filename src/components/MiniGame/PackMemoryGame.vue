<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import cards from '@/data/wc-26/catalog'
import type { CardDefinition, PlayerCardDefinition } from '@/types'

type Phase = 'reveal' | 'question' | 'result'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()

const epicCards: PlayerCardDefinition[] = cards.filter(
  (card: CardDefinition): card is PlayerCardDefinition =>
    card.kind === 'player' && card.rarity === 'epic',
)
const legendaryCards: PlayerCardDefinition[] = cards.filter(
  (card: CardDefinition): card is PlayerCardDefinition =>
    card.kind === 'player' && card.rarity === 'legendary',
)

const roundsCount: number = 3
const cardsPerRarity: number = 2
const revealDurationMs: number = 3200
const flipDurationMs: number = 500
const answerEnableDelayMs: number = flipDurationMs + 150
const resultDelayMs: number = 1800
const completionDelayMs: number = 1000

const roundIndex: Ref<number> = ref(0)
const phase: Ref<Phase> = ref('reveal')
const roundCards: Ref<PlayerCardDefinition[]> = ref([])
const targetCardId: Ref<string> = ref('')
const selectedSlot: Ref<number | undefined> = ref(undefined)
const isCorrect: Ref<boolean | undefined> = ref(undefined)
const isOpen: Ref<boolean> = ref(true)
const canAnswer: Ref<boolean> = ref(false)
const correctCount: Ref<number> = ref(0)
const isComplete: Ref<boolean> = ref(false)

let revealTimer: number | undefined
let answerEnableTimer: number | undefined
let resultTimer: number | undefined
let completionTimer: number | undefined

const phaseTranslationKey: ComputedRef<string> = computed((): string => {
  if (isComplete.value) return 'packHunt.memory.phaseComplete'
  if (phase.value === 'result') {
    return isCorrect.value ? 'packHunt.memory.phaseCorrect' : 'packHunt.memory.phaseWrong'
  }
  if (phase.value === 'question') return 'packHunt.memory.phaseQuestion'
  return 'packHunt.memory.phaseReveal'
})

const targetCard: ComputedRef<PlayerCardDefinition> = computed(
  (): PlayerCardDefinition =>
    roundCards.value.find(({ id }): boolean => id === targetCardId.value) ??
    roundCards.value[0] ??
    epicCards[0]!,
)

const slotOutcome = (slot: number): 'correct' | 'wrong-pick' | undefined => {
  if (phase.value !== 'result') return undefined
  if (roundCards.value[slot]?.id === targetCardId.value) return 'correct'
  if (slot === selectedSlot.value) return 'wrong-pick'
  return undefined
}

const shuffle = <T>(values: readonly T[]): T[] => {
  const result: T[] = [...values]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j: number = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

// В каждом раунде гарантированно показываются две epic- и две legendary-карточки
// из общего каталога коллекции.
const createRoundCards = (): PlayerCardDefinition[] =>
  shuffle([
    ...shuffle(epicCards).slice(0, cardsPerRarity),
    ...shuffle(legendaryCards).slice(0, cardsPerRarity),
  ])

const startQuestion = (): void => {
  isOpen.value = false
  phase.value = 'question'
  answerEnableTimer = window.setTimeout((): void => {
    canAnswer.value = true
  }, answerEnableDelayMs)
}

const initRound = (): void => {
  roundCards.value = createRoundCards()
  targetCardId.value =
    roundCards.value[Math.floor(Math.random() * roundCards.value.length)]?.id ?? ''
  selectedSlot.value = undefined
  isCorrect.value = undefined
  isOpen.value = true
  canAnswer.value = false
  phase.value = 'reveal'
  revealTimer = window.setTimeout((): void => startQuestion(), revealDurationMs)
}

// Промах не проваливает игру — раунд просто честно раскрывает, где лежала
// нужная карточка, и переходит дальше. correctCount — только для сводки в конце.
const selectSlot = (slot: number): void => {
  if (phase.value !== 'question' || !canAnswer.value) return
  selectedSlot.value = slot
  isCorrect.value = roundCards.value[slot]?.id === targetCardId.value
  if (isCorrect.value) correctCount.value += 1
  phase.value = 'result'
  isOpen.value = true
  canAnswer.value = false

  resultTimer = window.setTimeout((): void => {
    if (roundIndex.value + 1 >= roundsCount) {
      isComplete.value = true
      completionTimer = window.setTimeout((): void => {
        completionTimer = undefined
        emit('complete')
      }, completionDelayMs)
      return
    }
    roundIndex.value += 1
    initRound()
  }, resultDelayMs)
}

onMounted((): void => {
  initRound()
})

onBeforeUnmount((): void => {
  if (revealTimer !== undefined) window.clearTimeout(revealTimer)
  if (answerEnableTimer !== undefined) window.clearTimeout(answerEnableTimer)
  if (resultTimer !== undefined) window.clearTimeout(resultTimer)
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section class="w-full" :aria-label="t('packHunt.games.memory.title')">
    <div class="mb-3 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-black uppercase tracking-[0.14em] text-ink/50">
          {{ t('packHunt.memory.phase') }}
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
          v-for="index in roundsCount"
          :key="index"
          class="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-black"
          :class="
            index - 1 < roundIndex || isComplete
              ? 'border-emerald-700 bg-mint text-ink'
              : index - 1 === roundIndex
                ? 'border-coral bg-coral text-white ring-2 ring-coral/25'
                : 'border-ink/20 bg-paper text-ink/35'
          "
        >
          {{ index - 1 < roundIndex || isComplete ? '✓' : index }}
        </span>
      </div>

      <span class="text-xs font-bold text-ink/55">
        {{ t('packHunt.memory.correctLabel', { count: correctCount, total: roundsCount }) }}
      </span>
    </div>

    <p v-if="phase === 'reveal'" class="mb-3 text-center text-sm font-bold text-ink/60">
      {{ t('packHunt.memory.hintReveal') }}
    </p>
    <p v-else class="mb-3 text-center text-lg font-black text-ink">
      {{ t('packHunt.memory.questionCard', { name: targetCard.displayName }) }}
    </p>

    <div class="grid grid-cols-4 gap-2.5 sm:gap-4">
      <div v-for="slot in 4" :key="slot" class="[perspective:1000px]">
        <button
          type="button"
          class="relative aspect-[3/4] w-full [transform-style:preserve-3d] transition-transform ease-in-out"
          :style="{
            transform: isOpen ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transitionDuration: `${flipDurationMs}ms`,
          }"
          :disabled="phase !== 'question' || !canAnswer"
          :aria-label="t('packHunt.memory.cardLabel', { number: slot })"
          @click="selectSlot(slot - 1)"
        >
          <div
            class="absolute inset-0 flex flex-col items-center justify-center rounded-md border-4 border-ink bg-gold/30 [backface-visibility:hidden]"
          >
            <i class="pi pi-question text-2xl text-ink/40" aria-hidden="true" />
          </div>

          <div
            class="absolute inset-0 overflow-hidden rounded-md border-4 bg-paper [backface-visibility:hidden] [transform:rotateY(180deg)]"
            :class="
              slotOutcome(slot - 1) === 'correct'
                ? 'border-emerald-700 ring-4 ring-emerald-700'
                : slotOutcome(slot - 1) === 'wrong-pick'
                  ? 'border-red-600 ring-4 ring-red-600'
                  : 'border-ink'
            "
          >
            <img
              class="h-full w-full object-contain"
              :src="roundCards[slot - 1]?.image"
              :alt="roundCards[slot - 1]?.displayName ?? ''"
              draggable="false"
            />
            <span
              class="absolute right-1 top-1 rounded px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wide text-white shadow sm:text-[9px]"
              :class="
                roundCards[slot - 1]?.rarity === 'legendary'
                  ? 'bg-amber-500'
                  : 'bg-violet-600'
              "
            >
              {{ roundCards[slot - 1]?.rarity }}
            </span>
            <span
              class="absolute inset-x-0 bottom-0 bg-ink/85 px-1 py-1 text-[8px] font-black leading-tight text-white sm:text-[10px]"
            >
              {{ roundCards[slot - 1]?.displayName }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <div v-if="isComplete" class="mt-4 text-center" aria-live="polite">
      <i class="pi pi-check-circle animate-pulse text-4xl text-emerald-700" />
      <p class="mt-2 text-lg font-black">{{ t('packHunt.memory.allRoundsComplete') }}</p>
      <p class="mt-1 text-sm font-bold text-ink/60">
        {{ t('packHunt.memory.summary', { correct: correctCount, total: roundsCount }) }}
      </p>
    </div>
  </section>
</template>
