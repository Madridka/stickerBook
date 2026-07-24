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
    class="mx-auto h-full min-h-0 w-full overflow-y-auto py-2 pr-1"
    data-goals-view
  >
    <header class="border-2 border-ink bg-paper p-4 shadow-[5px_5px_0_rgb(var(--color-gold)/0.6)]">
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
      <h2 class="text-xl font-black">{{ t('goals.sections.rewards') }}</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
      <h2 class="text-xl font-black">{{ t('goals.sections.active') }}</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <GoalCard
          v-for="goal in activeGoals"
          :key="goal.definition.id"
          :goal="goal"
          @action="navigate(goal)"
        />
      </div>
    </section>

    <section v-if="claimedGoals.length" class="mt-6 pb-5" data-goals-completed>
      <h2 class="text-xl font-black">{{ t('goals.sections.completed') }}</h2>
      <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <GoalCard v-for="goal in claimedGoals" :key="goal.definition.id" :goal="goal" />
      </div>
    </section>
  </section>
</template>

<style scoped>
:deep(.overall-goals-progress .p-progressbar-value) {
  background: rgb(var(--color-mint));
}
</style>
