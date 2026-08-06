import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { getLocalDateKey } from '@/utils/dailyDateKey'
import { DAILY_TASK_CONFIG } from '@/config/gameBalance'
import { CLOCK_CONFIG } from '@/config/runtimeConfig'
import { dailyTaskDefinitionById } from '@/features/dailyTasks/dailyTaskDefinitions'
import {
  beginDailyTaskReward,
  claimDailyTaskReward,
  DAILY_TASKS_CHANGED_EVENT,
  ensureDailyTasksState,
} from '@/features/dailyTasks/dailyTaskService'
import type {
  DailyTaskRuntimeState,
  DailyTasksState,
  PendingDailyCardChoice,
} from '@/features/dailyTasks/types'
import { useCollectionStore } from './collection'

const createLoadingState = (): DailyTasksState => ({
  id: 'current',
  dayKey: '',
  tasks: [],
  rewardClaimed: false,
  updatedAt: 0,
})

export const useDailyTasksStore = defineStore('dailyTasks', () => {
  const collection = useCollectionStore()
  const state: Ref<DailyTasksState> = ref(createLoadingState())
  const isLoaded: Ref<boolean> = ref(false)
  const isRewardOpen: Ref<boolean> = ref(false)
  const selectedCardId: Ref<string | null> = ref(null)
  const isOpeningReward: Ref<boolean> = ref(false)
  const isClaimingReward: Ref<boolean> = ref(false)
  const now: Ref<number> = ref(Date.now())

  const tasks: ComputedRef<DailyTaskRuntimeState[]> = computed(() =>
    state.value.tasks.flatMap((task): DailyTaskRuntimeState[] => {
      const definition = dailyTaskDefinitionById.get(task.taskId)
      if (!definition) return []
      return [
        {
          ...task,
          definition,
          percent: Math.min(100, Math.round((task.progress / definition.target) * 100)),
        },
      ]
    }),
  )
  const completedCount: ComputedRef<number> = computed(
    (): number => tasks.value.filter(({ status }) => status !== 'in-progress').length,
  )
  const allCompleted: ComputedRef<boolean> = computed(
    (): boolean =>
      tasks.value.length === DAILY_TASK_CONFIG.tasksPerDay &&
      tasks.value.every(({ status }) => status === 'completed'),
  )
  const rewardAvailable: ComputedRef<boolean> = computed(
    (): boolean => allCompleted.value && !state.value.rewardClaimed,
  )
  const millisecondsUntilReset: ComputedRef<number> = computed((): number => {
    const date: Date = new Date(now.value)
    const nextMidnight: number = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate() + 1,
    ).getTime()
    return Math.max(0, nextMidnight - now.value)
  })
  const activePendingReward: ComputedRef<PendingDailyCardChoice | undefined> = computed(
    (): PendingDailyCardChoice | undefined =>
      isRewardOpen.value ? state.value.pendingReward : undefined,
  )

  const load = async (timestamp: number = Date.now()): Promise<void> => {
    state.value = await ensureDailyTasksState(timestamp)
    if (
      isRewardOpen.value &&
      !state.value.pendingReward
    ) {
      isRewardOpen.value = false
      selectedCardId.value = null
    }
    now.value = timestamp
    isLoaded.value = true
  }

  const openReward = async (): Promise<boolean> => {
    if (isOpeningReward.value || isClaimingReward.value || isRewardOpen.value) return false
    isOpeningReward.value = true
    try {
      const result = await beginDailyTaskReward()
      state.value = result.state
      if (result.status !== 'ready') return false
      isRewardOpen.value = true
      selectedCardId.value = null
      return true
    } finally {
      isOpeningReward.value = false
    }
  }

  const closeReward = (): void => {
    if (isClaimingReward.value) return
    isRewardOpen.value = false
    selectedCardId.value = null
  }

  const claimReward = async (): Promise<boolean> => {
    const cardId: string | null = selectedCardId.value
    if (!cardId || isClaimingReward.value) return false
    isClaimingReward.value = true
    try {
      const result = await claimDailyTaskReward(cardId)
      state.value = result.state
      if (result.status !== 'claimed') return false
      await collection.load()
      isRewardOpen.value = false
      selectedCardId.value = null
      return true
    } finally {
      isClaimingReward.value = false
    }
  }

  const refresh = async (): Promise<void> => load(Date.now())
  const handleChanged = (): void => {
    void refresh()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener(DAILY_TASKS_CHANGED_EVENT, handleChanged)
  }

  const timer: ReturnType<typeof setInterval> = setInterval((): void => {
    const timestamp: number = Date.now()
    now.value = timestamp
    if (isLoaded.value && state.value.dayKey !== getLocalDateKey(timestamp)) void load(timestamp)
  }, CLOCK_CONFIG.refreshIntervalMs)

  onScopeDispose((): void => {
    clearInterval(timer)
    if (typeof window !== 'undefined') {
      window.removeEventListener(DAILY_TASKS_CHANGED_EVENT, handleChanged)
    }
  })
  void load()

  return {
    state,
    tasks,
    completedCount,
    allCompleted,
    rewardAvailable,
    millisecondsUntilReset,
    isRewardOpen,
    activePendingReward,
    selectedCardId,
    isLoaded,
    isOpeningReward,
    isClaimingReward,
    load,
    refresh,
    openReward,
    closeReward,
    claimReward,
  }
})
