<script setup lang="ts">
import type { GoalRuntimeState } from '@/features/goals/types'

defineProps<{ goals: GoalRuntimeState[] }>()
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <section
    v-if="goals.length"
    class="border border-ink/15 bg-paper/80 p-3"
    aria-labelledby="nearest-goals-title"
    data-nearest-goals
  >
    <div class="flex items-center justify-between gap-3">
      <h2 id="nearest-goals-title" class="text-base font-black">Ближайшие цели</h2>
      <button class="text-xs font-black text-coral hover:underline" type="button" @click="emit('open')">
        Все цели
      </button>
    </div>
    <ul class="mt-2 grid gap-1.5">
      <li
        v-for="goal in goals"
        :key="goal.definition.id"
        class="flex items-center justify-between gap-3 text-xs"
      >
        <span class="min-w-0 truncate font-bold">
          <i v-if="goal.isRewardAvailable" class="pi pi-gift mr-1 text-coral" />
          {{ goal.definition.title }}
        </span>
        <strong class="shrink-0 tabular-nums">
          {{ goal.progress.current }} / {{ goal.progress.target }}
        </strong>
      </li>
    </ul>
  </section>
</template>
