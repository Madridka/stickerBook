<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { getAlbumCard } from '@/data/albumRegistry'
import { DAILY_TASK_CONFIG } from '@/config/gameBalance'
import { formatCountdown } from '@/utils/formatCountdown'
import { useCollectionStore } from '@/stores/collection'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import type { CardDefinition } from '@/types'

import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import CardChoiceDialog from '@/components/Sticker/CardChoiceDialog.vue'

const { t } = useI18n()
const router = useRouter()
const dailyTasks = useDailyTasksStore()
const collection = useCollectionStore()
const errorKey: Ref<string | null> = ref(null)

const resetLabel: ComputedRef<string> = computed((): string =>
  formatCountdown(dailyTasks.millisecondsUntilReset),
)
const rewardCards: ComputedRef<CardDefinition[]> = computed((): CardDefinition[] => {
  const pending = dailyTasks.activePendingReward
  if (!pending) return []
  return pending.candidateCardIds
    .map((cardId: string): CardDefinition | undefined =>
      getAlbumCard(pending.albumId, cardId),
    )
    .filter((card): card is CardDefinition => Boolean(card))
})
const ownedCardIds: ComputedRef<Set<string>> = computed((): Set<string> => {
  const albumId = dailyTasks.activePendingReward?.albumId
  return albumId ? collection.getCollectedCardIds(albumId) : new Set<string>()
})

const openReward = async (): Promise<void> => {
  errorKey.value = null
  if (!(await dailyTasks.openReward())) errorKey.value = 'dailyTasks.errors.open'
}

const claimReward = async (): Promise<void> => {
  errorKey.value = null
  if (!(await dailyTasks.claimReward())) errorKey.value = 'dailyTasks.errors.claim'
}

const closeReward = (): void => {
  dailyTasks.closeReward()
  errorKey.value = null
}
const chooseCardLabel = (name: string): string => t('dailyTasks.reward.choose', { name })
const handleRewardVisibility = (visible: boolean): void => {
  if (!visible) closeReward()
}
const navigate = async (route: RouteLocationRaw): Promise<void> => {
  await router.push(route)
}
</script>

<template>
  <section
    class="mt-5 border-2 border-ink bg-paper p-3 shadow-[5px_5px_0_rgb(var(--color-coral)/0.3)] sm:p-4"
    data-daily-tasks
  >
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
          {{ t('dailyTasks.eyebrow') }}
        </p>
        <h2 class="text-xl font-black">{{ t('dailyTasks.title') }}</h2>
      </div>
      <div class="text-right text-xs font-bold text-ink/55">
        <strong class="block text-sm text-ink">
          {{
            t('dailyTasks.completed', {
              current: dailyTasks.completedCount,
              total: DAILY_TASK_CONFIG.tasksPerDay,
            })
          }}
        </strong>
        {{ t('dailyTasks.resetIn', { time: resetLabel }) }}
      </div>
    </div>

    <!-- Компактная дневная тройка остаётся читаемой на мобильном и в одну строку на desktop. -->
    <div class="mt-3 grid gap-3 lg:grid-cols-3">
      <button
        v-for="task in dailyTasks.tasks"
        :key="task.taskId"
        class="group flex min-h-32 flex-col border border-ink/15 bg-mint/10 p-3 text-left transition hover:-translate-y-0.5 hover:border-coral hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral"
        :data-daily-task-id="task.taskId"
        type="button"
        :aria-label="t('dailyTasks.openAction', { task: t(task.definition.titleKey) })"
        @click="navigate(task.definition.route)"
      >
        <div class="flex items-start gap-2">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-coral/15 text-coral">
            <i :class="task.definition.icon" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-black leading-tight">{{ t(task.definition.titleKey) }}</h3>
            <strong class="mt-1 block text-xs tabular-nums text-ink/60">
              {{ Math.min(task.definition.target, Math.floor(task.progress)) }} /
              {{ task.definition.target }}
            </strong>
          </div>
        </div>
        <ProgressBar
          class="daily-task-progress mt-2 h-2"
          :value="task.percent"
          :show-value="false"
        />
        <div class="mt-auto pt-3">
          <p v-if="task.status !== 'in-progress'" class="text-xs font-black text-emerald-700">
            <i class="pi pi-check-circle mr-1" aria-hidden="true" />
            {{ t('dailyTasks.completedTask') }}
          </p>
          <p v-else class="flex items-center justify-between text-xs font-semibold text-ink/45">
            <span>{{ t('dailyTasks.inProgress') }}</span>
            <i
              class="pi pi-arrow-right text-coral transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </p>
        </div>
      </button>
    </div>

    <div
      v-if="dailyTasks.allCompleted"
      class="mt-3 border border-ink/15 bg-gold/10 p-3"
      data-daily-completion-reward
    >
      <p v-if="dailyTasks.state.rewardClaimed" class="text-sm font-black text-emerald-700">
        <i class="pi pi-check-circle mr-1" aria-hidden="true" />
        {{ t('dailyTasks.claimed') }}
      </p>
      <Button
        v-else
        class="w-full"
        icon="pi pi-gift"
        :label="t('dailyTasks.claimAll')"
        :loading="dailyTasks.isOpeningReward"
        :disabled="dailyTasks.isClaimingReward || dailyTasks.isRewardOpen"
        type="button"
        @click="openReward"
      />
    </div>

    <p v-if="errorKey && !dailyTasks.isRewardOpen" class="mt-3 text-xs font-bold text-coral">
      {{ t(errorKey) }}
    </p>

    <CardChoiceDialog
      :visible="dailyTasks.isRewardOpen"
      v-model:selected-id="dailyTasks.selectedCardId"
      :cards="rewardCards"
      :owned-card-ids="ownedCardIds"
      :eyebrow="t('dailyTasks.reward.eyebrow')"
      :title="t('dailyTasks.reward.title')"
      :description="t('dailyTasks.reward.description')"
      :claim-label="t('dailyTasks.reward.claim')"
      :claiming-label="t('dailyTasks.reward.claiming')"
      :owned-label="t('dailyTasks.reward.owned')"
      :not-owned-label="t('dailyTasks.reward.new')"
      :choose-label="chooseCardLabel"
      :loading="dailyTasks.isClaimingReward"
      :error="errorKey ? t(errorKey) : ''"
      @update:visible="handleRewardVisibility"
      @claim="claimReward"
    />
  </section>
</template>

<style scoped>
:deep(.daily-task-progress .p-progressbar-value) {
  background: rgb(var(--color-coral));
}
</style>
