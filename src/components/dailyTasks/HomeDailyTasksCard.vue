<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DailyTaskRuntimeState } from '@/features/dailyTasks/types'

import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'

defineProps<{ tasks: DailyTaskRuntimeState[] }>()
const emit = defineEmits<{ open: [] }>()
const { t } = useI18n()
</script>

<template>
  <article
    class="border-2 border-ink bg-paper p-3 shadow-[5px_5px_0_rgb(var(--color-coral))] sm:p-4"
    data-home-daily-tasks
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
          {{ t('home.daily.eyebrow') }}
        </p>
        <h2 class="mt-0.5 text-lg font-black leading-tight sm:text-xl">
          {{ t('home.daily.title') }}
        </h2>
      </div>
      <span class="rounded-full bg-coral/15 px-2 py-1 text-xs font-black text-coral">
        {{ tasks.filter(({ status }) => status !== 'in-progress').length }} / {{ tasks.length }}
      </span>
    </div>

    <!-- Показывает всю дневную тройку без вытеснения остальных блоков главного экрана. -->
    <div class="mt-2 grid gap-1.5">
      <div
        v-for="task in tasks"
        :key="task.taskId"
        class="grid grid-cols-[1fr_auto] items-center gap-x-2 border-l-2 px-2 py-1"
        :class="task.status === 'in-progress' ? 'border-coral bg-coral/5' : 'border-mint bg-mint/10'"
      >
        <span class="truncate text-xs font-black">{{ t(task.definition.titleKey) }}</span>
        <span class="text-[11px] font-black tabular-nums text-ink/55">
          {{ Math.min(task.definition.target, Math.floor(task.progress)) }} /
          {{ task.definition.target }}
        </span>
        <ProgressBar
          class="home-daily-progress col-span-2 mt-1 h-1.5"
          :value="task.percent"
          :show-value="false"
        />
      </div>
    </div>

    <Button
      class="mt-3 w-full"
      size="small"
      outlined
      :label="t('home.daily.open')"
      icon="pi pi-arrow-right"
      icon-pos="right"
      type="button"
      @click="emit('open')"
    />
  </article>
</template>

<style scoped>
:deep(.home-daily-progress .p-progressbar-value) {
  background: rgb(var(--color-coral));
}
</style>

