<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import type { GoalRuntimeState } from '@/features/goals/types'
import { CLICKER_CONFIG, HOME_VIEW_CONFIG } from '@/data/mainConst'
import { useRecommendedAction, type QuickAction } from '@/composables/useRecommendedAction'
import { useCollectionStore } from '@/stores/collection'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import { useGoalsStore } from '@/stores/goals'
import { formatCountdown } from '@/utils/formatCountdown'

import Button from 'primevue/button'
import ClickArea from '@/components/Clicker/ClickArea.vue'
import ClickEnergyPanel from '@/components/Clicker/ClickEnergyPanel.vue'
import CurrentGoalCard from '@/components/goals/CurrentGoalCard.vue'
import NearestGoals from '@/components/goals/NearestGoals.vue'

interface ClickEffectItem {
  id: number
  x: number
  y: number
  reward: string
}

const { t } = useI18n()
const router = useRouter()
const player = usePlayerStore()
const collection = useCollectionStore()
const inventory = useInventoryStore()
const goals = useGoalsStore()
const { recommendation, quickActions } = useRecommendedAction()
const effects: Ref<ClickEffectItem[]> = ref([])
let nextEffectId: number = 0
let completionTimer: number | undefined
const completionNotice: Ref<boolean> = ref(false)

const clickReward: ComputedRef<number> = computed((): number => {
  const rawReward: number = CLICKER_CONFIG.baseReward * (1 + collection.albumProgress / 100)
  const multiplier: number = 10 ** CLICKER_CONFIG.rewardPrecision
  return Math.round((rawReward + Number.EPSILON) * multiplier) / multiplier
})
const formattedClickReward: ComputedRef<string> = computed((): string =>
  clickReward.value.toLocaleString('ru-RU', {
    maximumFractionDigits: CLICKER_CONFIG.rewardPrecision,
  }),
)
const isClickDisabled: ComputedRef<boolean> = computed(
  (): boolean => !player.isLoaded || !collection.isLoaded || !player.canClick,
)
const clickLabel: ComputedRef<string> = computed((): string =>
  player.canClick
    ? t('home.clickPrompt', { reward: formattedClickReward.value })
    : t('home.noEnergy'),
)
const orderedQuickActions: ComputedRef<QuickAction[]> = computed((): QuickAction[] =>
  player.canClick
    ? quickActions.value
    : [...quickActions.value].sort(
        (left: QuickAction, right: QuickAction): number =>
          Number(left.requiresEnergy) - Number(right.requiresEnergy) ||
          right.priority - left.priority,
      ),
)
const nearestGoalsForHome: ComputedRef<GoalRuntimeState[]> = computed(() => {
  const recommendedGoalIds: Partial<Record<string, string>> = {
    'buy-pack': 'buy-first-pack',
    'open-pack': 'open-first-pack',
    'continue-opening': 'open-first-pack',
    'prepare-sticker': 'prepare-first-sticker',
    'place-sticker': 'place-first-sticker',
    'play-mini-game': 'complete-first-minigame',
    'exchange-duplicates': 'exchange-first-duplicates',
  }
  const duplicateGoalId =
    recommendedGoalIds[recommendation.value.id] ??
    (recommendation.value.id.startsWith('guide-')
      ? recommendation.value.id.replace(/^guide-/, '')
      : undefined)
  return goals.nearestGoals
    .filter(({ definition }): boolean => definition.id !== duplicateGoalId)
    .slice(0, 3)
})
const nextEnergyLabel: ComputedRef<string> = computed((): string =>
  formatCountdown(player.millisecondsUntilNextEnergy),
)
const fullEnergyLabel: ComputedRef<string> = computed((): string =>
  formatCountdown(player.millisecondsUntilFullEnergy),
)

const handleClick = (event: MouseEvent): void => {
  if (!player.addCoin(clickReward.value)) return
  const target: HTMLElement = event.currentTarget as HTMLElement
  const area: DOMRect =
    target.parentElement?.getBoundingClientRect() ?? target.getBoundingClientRect()
  const effect: ClickEffectItem = {
    id: nextEffectId++,
    x: event.clientX - area.left,
    y: event.clientY - area.top,
    reward: formattedClickReward.value,
  }
  effects.value = [...effects.value, effect]
  window.setTimeout((): void => {
    effects.value = effects.value.filter(({ id }): boolean => id !== effect.id)
  }, HOME_VIEW_CONFIG.clickEffectDurationMs)
}

const navigate = async (route: RouteLocationRaw): Promise<void> => {
  await router.push(route)
}

const navigateRecommendation = async (): Promise<void> => {
  if (recommendation.value.action) {
    await navigate(recommendation.value.action.route)
  }
}

watch(
  () => goals.lastCompletedGoalId,
  (current, previous): void => {
    if (!current || current === previous) return
    completionNotice.value = true
    if (completionTimer !== undefined) window.clearTimeout(completionTimer)
    completionTimer = window.setTimeout((): void => {
      completionNotice.value = false
    }, 4_500)
  },
)

onBeforeUnmount((): void => {
  if (completionTimer !== undefined) window.clearTimeout(completionTimer)
})
</script>

<template>
  <section
    class="mx-auto h-full min-h-0 w-full max-w-6xl overflow-x-hidden overflow-y-auto py-1 pr-1"
    data-home-view
  >
    <h1 class="sr-only">{{ t('home.hubTitle') }}</h1>

    <div
      class="grid min-h-full min-w-0 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,.88fr)] lg:grid-rows-[auto_auto_minmax(0,1fr)]"
    >
      <section
        class="order-1 grid min-w-0 grid-cols-4 overflow-hidden border-2 border-ink bg-paper shadow-[4px_4px_0_rgb(var(--color-gold)/0.5)] lg:col-start-2 lg:row-start-1"
        :aria-label="t('home.summary.label')"
        data-player-summary
      >
        <button
          class="flex min-w-0 items-center gap-1.5 px-1.5 py-2 text-left text-ink transition-colors hover:bg-gold/15 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-coral sm:px-2"
          type="button"
          :aria-label="t('home.summary.packs')"
          :title="t('home.summary.packs')"
          data-summary-link="packs"
          @click="navigate({ name: 'shop' })"
        >
          <i class="pi pi-box shrink-0 text-sm text-coral" aria-hidden="true" />
          <div class="min-w-0">
            <span
              class="block truncate text-[8px] font-black uppercase tracking-wide text-ink/45 sm:text-[9px]"
            >
              {{ t('home.summary.packs') }}
            </span>
            <strong
              class="block truncate text-base font-black leading-none tabular-nums sm:text-lg"
            >
              {{ inventory.packCount }}
            </strong>
          </div>
        </button>

        <button
          class="col-span-2 flex min-w-0 justify-center border-x border-ink/15 px-1.5 py-2 text-center text-ink transition-colors hover:bg-mint/20 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-coral sm:px-2"
          type="button"
          :aria-label="t('home.summary.collection')"
          :title="t('home.summary.collection')"
          data-summary-link="collection"
          @click="navigate({ name: 'collection' })"
        >
          <div class="flex min-w-0 items-center gap-1.5">
            <i class="pi pi-images shrink-0 text-sm text-coral" aria-hidden="true" />
            <div class="min-w-0">
              <span
                class="block truncate text-[8px] font-black uppercase tracking-wide text-ink/45 sm:text-[9px]"
              >
                {{ t('home.summary.collection') }}
              </span>
              <strong
                class="block whitespace-nowrap text-base font-black leading-none tabular-nums sm:text-lg"
              >
                {{ collection.collectedTotal }}/{{ collection.total }}
              </strong>
            </div>
          </div>
        </button>

        <button
          class="flex min-w-0 items-center gap-1.5 px-1.5 py-2 text-left text-ink transition-colors hover:bg-coral/10 focus-visible:relative focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-coral sm:px-2"
          type="button"
          :aria-label="t('home.summary.goals')"
          :title="t('home.summary.goals')"
          data-summary-link="goals"
          @click="navigate({ name: 'goals' })"
        >
          <i class="pi pi-flag shrink-0 text-sm text-coral" aria-hidden="true" />
          <div class="min-w-0">
            <span
              class="block truncate text-[8px] font-black uppercase tracking-wide text-ink/45 sm:text-[9px]"
            >
              {{ t('home.summary.goals') }}
            </span>
            <strong
              class="block truncate text-base font-black leading-none tabular-nums sm:text-lg"
            >
              {{ goals.overallProgress }}%
            </strong>
          </div>
        </button>
      </section>

      <div class="order-2 flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-2">
        <CurrentGoalCard :goal="recommendation" @action="navigateRecommendation" />
        <NearestGoals :goals="nearestGoalsForHome" @open="navigate({ name: 'goals' })" />

        <section
          v-if="!player.canClick"
          class="border-l-4 border-coral bg-coral/10 p-3"
          data-zero-energy
        >
          <h2 class="font-black">{{ t('home.zeroEnergy.title') }}</h2>
          <p class="mt-1 text-xs text-ink/65">
            {{ t('home.zeroEnergy.next', { time: nextEnergyLabel }) }}
            · {{ t('home.zeroEnergy.full', { time: fullEnergyLabel }) }}
          </p>
        </section>
      </div>

      <div class="order-3 min-w-0 lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:min-h-0">
        <section
          class="flex min-h-[20rem] flex-col items-center border border-ink/10 bg-white/20 p-3 transition-opacity sm:min-h-[24rem] lg:h-full lg:min-h-0"
          :class="{ 'opacity-60': !player.canClick }"
          data-clicker
        >
          <div class="text-center">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-coral">
              {{ t('home.eyebrow') }}
            </p>
            <h2 class="text-2xl font-black tracking-tight sm:text-3xl">
              {{ t('home.clickTitle') }}
            </h2>
          </div>
          <ClickEnergyPanel
            :current="player.availableEnergy"
            :limit="player.energyLimit"
            :percent="player.energyPercent"
            :milliseconds-until-next="player.millisecondsUntilNextEnergy"
            :collection-progress="collection.albumProgress"
            :reward="formattedClickReward"
          />
          <ClickArea
            :effects="effects"
            :disabled="isClickDisabled"
            :label="clickLabel"
            @click="handleClick"
          />
          <p class="text-xs font-semibold text-ink/55 sm:text-sm">{{ clickLabel }}</p>
        </section>
      </div>

      <section
        v-if="orderedQuickActions.length"
        class="order-4 min-w-0 border-2 border-ink bg-mint/20 p-3 shadow-[5px_5px_0_rgb(var(--color-coral)/0.35)] lg:col-start-2 lg:row-start-3 lg:min-h-0 lg:overflow-y-auto"
        aria-labelledby="quick-actions-title"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 id="quick-actions-title" class="text-lg font-black">
            {{ t('home.quick.title') }}
          </h2>
          <span class="rounded-full bg-ink px-2 py-0.5 text-xs font-black text-paper">
            {{ orderedQuickActions.length }}
          </span>
        </div>
        <p v-if="!player.canClick" class="mb-2 text-xs text-ink/55">
          {{ t('home.quick.whileRecovering') }}
        </p>
        <div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1">
          <Button
            v-for="action in orderedQuickActions"
            :key="action.id"
            class="quick-action min-w-0 justify-start text-left"
            outlined
            type="button"
            :data-quick-action="action.id"
            @click="navigate(action.route)"
          >
            <span class="min-w-0 flex-1">
              <strong class="block truncate text-sm">{{ t(action.titleKey) }}</strong>
              <small v-if="action.descriptionKey" class="block truncate text-ink/55">
                {{ t(action.descriptionKey, { count: action.badge ?? 0 }) }}
              </small>
            </span>
            <span
              v-if="action.badge !== undefined"
              class="ml-2 rounded-full bg-coral/15 px-2 py-0.5 text-xs font-black text-coral"
            >
              {{ action.badge }}
            </span>
          </Button>
        </div>
      </section>
    </div>

    <Transition name="goal-notice">
      <aside
        v-if="completionNotice"
        class="fixed bottom-5 right-5 z-40 border-2 border-ink bg-mint px-4 py-3 shadow-[5px_5px_0_rgb(var(--color-coral))]"
        role="status"
        data-goal-completed-notice
      >
        <strong class="block">{{ t('home.missionDone') }}</strong>
        <span class="text-sm">{{ t('home.rewardIsReady') }}</span>
      </aside>
    </Transition>
  </section>
</template>

<style scoped>
:deep(.quick-action .p-button-label) {
  min-width: 0;
  width: 100%;
}

.goal-notice-enter-active,
.goal-notice-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.goal-notice-enter-from,
.goal-notice-leave-to {
  opacity: 0;
  transform: translateY(0.75rem);
}
</style>
