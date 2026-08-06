<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { GoalRuntimeState } from '@/features/goals/types'

import Button from 'primevue/button'

defineProps<{ goals: GoalRuntimeState[] }>()
const emit = defineEmits<{ open: [] }>()
const { t } = useI18n()
</script>

<template>
  <section
    v-if="goals.length"
    class="border border-ink/15 bg-paper/80 p-3"
    aria-labelledby="nearest-goals-title"
    data-nearest-goals
  >
    <div class="flex items-center justify-between gap-3">
      <h2 id="nearest-goals-title" class="text-base font-black">{{ t('goals.nearest') }}</h2>
      <Button
        class="text-xs"
        :label="t('goals.allGoals')"
        text
        type="button"
        @click="emit('open')"
      />
    </div>
    <ul class="mt-2 grid gap-1.5">
      <li
        v-for="goal in goals"
        :key="goal.definition.id"
        class="flex items-center justify-between gap-3 text-xs"
      >
        <span class="min-w-0 truncate font-bold">
          <i v-if="goal.isRewardAvailable" class="pi pi-gift mr-1 text-coral" />
          {{ t(goal.definition.titleKey) }}
        </span>
        <strong class="shrink-0 tabular-nums">
          {{ goal.progress.current }} / {{ goal.progress.target }}
        </strong>
      </li>
    </ul>
  </section>
</template>
