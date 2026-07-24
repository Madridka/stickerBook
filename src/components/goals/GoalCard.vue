<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GoalRuntimeState } from '@/features/goals/types'

import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'

const props = defineProps<{
  goal: GoalRuntimeState
  claiming?: boolean
}>()
const emit = defineEmits<{
  action: []
  claim: []
}>()
const { t } = useI18n()
const progressPercent: ComputedRef<number> = computed(() =>
  props.goal.progress.target
    ? Math.min(100, (props.goal.progress.current / props.goal.progress.target) * 100)
    : 0,
)
</script>

<template>
  <article
    class="goal-card flex h-full flex-col overflow-hidden border-2 border-ink/25 p-4 pt-5"
    :class="{ 'goal-card--locked': goal.status === 'locked' }"
    :data-goal-id="goal.definition.id"
    :data-goal-status="goal.status"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[10px] font-black uppercase tracking-widest text-coral">
          {{ t(`goals.categories.${goal.definition.category}`) }}
        </p>
        <h3 class="mt-1 text-lg font-black leading-tight">{{ goal.definition.title }}</h3>
      </div>
      <span class="goal-card__status shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase">
        {{ t(`goals.status.${goal.status}`) }}
      </span>
    </div>

    <p class="mt-2 flex-1 text-sm leading-relaxed text-ink/65">
      {{ goal.definition.description }}
    </p>

    <div class="mt-4">
      <div class="mb-1 flex justify-between text-xs font-black tabular-nums">
        <span>{{ t('goals.progress') }}</span>
        <span>{{ goal.progress.current }} / {{ goal.progress.target }}</span>
      </div>
      <ProgressBar
        class="goal-card-progress h-2"
        :value="progressPercent"
        :show-value="false"
        data-goal-progress
      />
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span
        v-for="(reward, index) in goal.definition.reward"
        :key="`${reward.type}-${index}`"
        class="rounded bg-gold/20 px-2 py-1 text-xs font-black"
      >
        <template v-if="reward.type === 'coins'">
          <i class="pi pi-wallet mr-1" />{{ t('goals.rewards.coins') }} {{ reward.amount }}
        </template>
        <template v-else-if="reward.type === 'energy'">
          <i class="pi pi-bolt mr-1" />{{ reward.amount }} {{ t('goals.rewards.energy') }}
        </template>
        <template v-else>
          <i class="pi pi-box mr-1" />{{ reward.amount }} {{ t('goals.rewards.pack') }}
        </template>
      </span>
    </div>

    <div class="mt-4 flex gap-2">
      <Button
        v-if="goal.isRewardAvailable"
        class="flex-1"
        :label="t('goals.claim')"
        icon="pi pi-gift"
        type="button"
        :loading="claiming"
        data-goal-claim
        @click="emit('claim')"
      />
      <Button
        v-else-if="goal.definition.action && goal.status === 'active'"
        class="flex-1"
        :label="goal.definition.action.label"
        icon="pi pi-arrow-right"
        icon-pos="right"
        outlined
        type="button"
        data-goal-action
        @click="emit('action')"
      />
      <span v-else-if="goal.status === 'claimed'" class="text-sm font-black text-ink/55">
        <i class="pi pi-check-circle mr-1 text-mint" />{{ t('goals.rewardClaimed') }}
      </span>
      <span v-else-if="goal.status === 'locked'" class="text-sm font-bold text-ink/50">
        <i class="pi pi-lock mr-1" />{{ t('goals.dependencyLocked') }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.goal-card {
  position: relative;
  background:
    linear-gradient(rgb(255 255 255 / 0.32), rgb(255 255 255 / 0.32)),
    rgb(var(--color-paper));
  box-shadow: 5px 5px 0 rgb(var(--color-ink) / 0.13);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.goal-card::before {
  position: absolute;
  inset: 0 0 auto;
  height: 0.3rem;
  background: rgb(var(--color-mint));
  content: '';
}

.goal-card:hover {
  border-color: rgb(var(--color-ink) / 0.48);
  box-shadow: 7px 7px 0 rgb(var(--color-ink) / 0.16);
  transform: translate(-1px, -1px);
}

.goal-card[data-goal-status='completed'] {
  border-color: rgb(var(--color-coral) / 0.7);
  box-shadow: 5px 5px 0 rgb(var(--color-gold) / 0.62);
}

.goal-card[data-goal-status='completed']::before {
  background: rgb(var(--color-coral));
}

.goal-card[data-goal-status='claimed']::before {
  background: rgb(var(--color-ink) / 0.3);
}

.goal-card--locked {
  opacity: 0.68;
}

.goal-card__status {
  background: rgb(var(--color-mint) / 0.42);
  color: rgb(var(--color-ink));
}

.goal-card[data-goal-status='completed'] .goal-card__status {
  background: rgb(var(--color-coral) / 0.14);
  color: rgb(var(--color-coral));
}

.goal-card[data-goal-status='claimed'] .goal-card__status,
.goal-card[data-goal-status='locked'] .goal-card__status {
  background: rgb(var(--color-ink) / 0.09);
  color: rgb(var(--color-ink) / 0.65);
}

:deep(.goal-card-progress .p-progressbar-value) {
  background: rgb(var(--color-coral));
}

@media (prefers-reduced-motion: reduce) {
  .goal-card {
    transition: none;
  }

  .goal-card:hover {
    transform: none;
  }
}
</style>
