<script setup lang="ts">
import type { RecommendedAction } from '@/composables/useRecommendedAction'
import { useI18n } from 'vue-i18n'

import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'

defineProps<{ goal: RecommendedAction }>()
const emit = defineEmits<{ action: [] }>()
const { t } = useI18n()
</script>

<template>
  <article
    class="border-2 border-ink bg-paper p-4 shadow-[5px_5px_0_rgb(var(--color-coral))] sm:p-5"
    data-current-goal
  >
    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
      {{ t('home.goal.eyebrow') }}
    </p>
    <h2 class="mt-1 text-xl font-black leading-tight sm:text-2xl">
      {{ t(goal.titleKey) }}
    </h2>
    <p class="mt-1.5 text-sm leading-relaxed text-ink/65">
      {{ t(goal.descriptionKey, goal.descriptionParams ?? {}) }}
    </p>

    <div v-if="goal.progress" class="mt-3">
      <div class="mb-1 flex justify-between text-xs font-black tabular-nums">
        <span>{{ t('home.goal.progress') }}</span>
        <span>{{ goal.progress.current }} / {{ goal.progress.target }}</span>
      </div>
      <ProgressBar
        class="goal-progress h-2.5"
        :value="Math.min(100, (goal.progress.current / goal.progress.target) * 100)"
        :show-value="false"
      />
    </div>

    <Button
      class="mt-4 w-full"
      :label="t(goal.action.labelKey)"
      icon="pi pi-arrow-right"
      icon-pos="right"
      type="button"
      data-goal-action
      @click="emit('action')"
    />
  </article>
</template>

<style scoped>
:deep(.goal-progress .p-progressbar-value) {
  background: rgb(var(--color-coral));
}
</style>
