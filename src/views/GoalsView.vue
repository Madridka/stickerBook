<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { GoalCategory, GoalRuntimeState } from '@/features/goals/types'
import { useGoalsStore } from '@/stores/goals'

import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import GoalCard from '@/components/goals/GoalCard.vue'

type CategoryFilter = GoalCategory | 'all'

const goalsStore = useGoalsStore()
const router = useRouter()
const { t } = useI18n()
const activeCategory: Ref<CategoryFilter> = ref('all')
const categories: CategoryFilter[] = [
  'all',
  'packs',
  'collection',
  'album',
  'minigames',
]
const visibleGoals: ComputedRef<GoalRuntimeState[]> = computed(() =>
  goalsStore.visibleGoals(activeCategory.value),
)
const rewardGoals = computed(() =>
  visibleGoals.value.filter(({ status }) => status === 'completed'),
)
const activeGoals = computed(() =>
  visibleGoals.value.filter(({ status }) => status === 'active' || status === 'locked'),
)
const claimedGoals = computed(() =>
  visibleGoals.value.filter(({ status }) => status === 'claimed'),
)

const navigate = async (goal: GoalRuntimeState): Promise<void> => {
  if (goal.definition.action) await router.push(goal.definition.action.route)
}
</script>

<template>
  <section
    class="goals-view mx-auto h-full min-h-0 w-full overflow-y-auto border border-ink/10 px-3 py-3 sm:px-4 sm:py-4"
    data-goals-view
  >
    <header class="relative border-2 border-ink bg-paper p-4 shadow-[6px_6px_0_rgb(var(--color-gold)/0.65)]">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.18em] text-coral">
            {{ t('goals.eyebrow') }}
          </p>
          <h1 class="mt-1 text-3xl font-black">{{ t('goals.title') }}</h1>
          <p class="mt-1 text-sm text-ink/65">{{ t('goals.description') }}</p>
        </div>
        <strong class="text-2xl font-black tabular-nums">{{ goalsStore.overallProgress }}%</strong>
      </div>
      <ProgressBar
        class="overall-goals-progress mt-3 h-2.5"
        :value="goalsStore.overallProgress"
        :show-value="false"
      />
    </header>

    <nav class="mt-5 flex flex-wrap gap-2" :aria-label="t('goals.filter')">
      <Button
        v-for="category in categories"
        :key="category"
        size="small"
        :outlined="activeCategory !== category"
        :label="t(`goals.categories.${category}`)"
        type="button"
        @click="activeCategory = category"
      />
    </nav>

    <section v-if="rewardGoals.length" class="mt-6" data-goals-rewards>
      <h2 class="goals-section-title text-xl font-black">
        <span>{{ t('goals.sections.rewards') }}</span>
      </h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GoalCard
          v-for="goal in rewardGoals"
          :key="goal.definition.id"
          :goal="goal"
          :claiming="goalsStore.claimingGoalIds.has(goal.definition.id)"
          @claim="goalsStore.claim(goal.definition.id)"
        />
      </div>
    </section>

    <section v-if="activeGoals.length" class="mt-6" data-goals-active>
      <h2 class="goals-section-title text-xl font-black">
        <span>{{ t('goals.sections.active') }}</span>
      </h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GoalCard
          v-for="goal in activeGoals"
          :key="goal.definition.id"
          :goal="goal"
          @action="navigate(goal)"
        />
      </div>
    </section>

    <section v-if="claimedGoals.length" class="mt-6 pb-5" data-goals-completed>
      <h2 class="goals-section-title text-xl font-black">
        <span>{{ t('goals.sections.completed') }}</span>
      </h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GoalCard v-for="goal in claimedGoals" :key="goal.definition.id" :goal="goal" />
      </div>
    </section>
  </section>
</template>

<style scoped>
.goals-view {
  background-color: rgb(var(--color-mint) / 0.16);
  background-image:
    linear-gradient(rgb(var(--color-paper) / 0.35) 1px, transparent 1px),
    linear-gradient(90deg, rgb(var(--color-paper) / 0.35) 1px, transparent 1px);
  background-size: 24px 24px;
  box-shadow: inset 0 0 0 1px rgb(var(--color-paper) / 0.45);
}

.goals-section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.goals-section-title::after {
  height: 2px;
  flex: 1;
  background: rgb(var(--color-ink) / 0.12);
  content: '';
}

.goals-section-title span {
  padding: 0.2rem 0.55rem;
  background: rgb(var(--color-paper) / 0.82);
  box-shadow: 3px 3px 0 rgb(var(--color-ink) / 0.1);
}

:deep(.overall-goals-progress .p-progressbar-value) {
  background: rgb(var(--color-mint));
}
</style>
