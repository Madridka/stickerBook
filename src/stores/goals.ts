import { computed, onScopeDispose, ref, watch, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database } from '@/db/database'
import albumData from '@/data/wc-26/album'
import { cardById } from '@/data/wc-26/catalog'
import { goalDefinitions, GOAL_ALBUM_ID } from '@/features/goals/goalDefinitions'
import { GOALS_CHANGED_EVENT } from '@/features/goals/goalCounterService'
import { resolveGoals } from '@/features/goals/goalProgressResolver'
import {
  claimGoalReward,
  type ClaimGoalRewardResult,
} from '@/features/goals/goalRewardService'
import type {
  GoalCategory,
  GoalCounter,
  GoalPlayerState,
  GoalProgressContext,
  GoalRuntimeState,
} from '@/features/goals/types'
import { useCollectionStore } from './collection'
import { useInventoryStore } from './inventory'
import { usePlayerStore } from './player'

export type ClaimGoalResult = ClaimGoalRewardResult['status']

export const useGoalsStore = defineStore('goals', () => {
  const collection = useCollectionStore()
  const inventory = useInventoryStore()
  const player = usePlayerStore()
  const playerStates: Ref<GoalPlayerState[]> = ref([])
  const counters: Ref<GoalCounter[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)
  const claimingGoalIds: Ref<Set<string>> = ref(new Set())
  const lastCompletedGoalId: Ref<string | undefined> = ref(undefined)
  let reconcileQueue: Promise<void> = Promise.resolve()

  const context: ComputedRef<GoalProgressContext> = computed(() => {
    const occupiedSlotIds = new Set(
      collection.items
        .filter(({ instance }): boolean => instance.location === 'album')
        .map(({ instance }): string => (instance.placement?.slotId ?? '').replace(/-slot$/, ''))
        .filter(Boolean),
    )
    const pageProgress = Object.fromEntries(
      albumData.pages.map((page): [string, number] => [
        page.id,
        page.slots.filter((slot): boolean => occupiedSlotIds.has(slot.id)).length,
      ]),
    )
    const rarities: GoalProgressContext['rarityCollected'] = {}
    let variantsCollected = 0
    for (const item of collection.items) {
      if (item.instance.location === 'deleted') continue
      const card = cardById.get(item.instance.playerId)
      if (!card) continue
      rarities[card.rarity] = (rarities[card.rarity] ?? 0) + 1
      if (card.baseCardId) variantsCollected += 1
    }

    return {
      counters: Object.fromEntries(
        counters.value.map((counter): [GoalCounter['id'], number] => [
          counter.id,
          counter.value,
        ]),
      ),
      uniqueCardsCollected: collection.collectedTotal,
      stickersPrepared: collection.items.filter(
        ({ instance }): boolean => Boolean(instance.preparation),
      ).length,
      stickersPlaced: occupiedSlotIds.size,
      albumSlotsFilled: { [GOAL_ALBUM_ID]: occupiedSlotIds.size },
      albumProgress: { [GOAL_ALBUM_ID]: collection.albumProgress },
      albumPagesFilled: { [GOAL_ALBUM_ID]: pageProgress },
      rarityCollected: rarities,
      variantsCollected,
    }
  })

  const goals: ComputedRef<GoalRuntimeState[]> = computed(() =>
    resolveGoals(goalDefinitions, context.value, playerStates.value),
  )
  const activeGoals: ComputedRef<GoalRuntimeState[]> = computed(() =>
    goals.value.filter(({ status }): boolean => status === 'active'),
  )
  const rewardGoals: ComputedRef<GoalRuntimeState[]> = computed(() =>
    goals.value.filter(({ status }): boolean => status === 'completed'),
  )
  const completedGoals: ComputedRef<GoalRuntimeState[]> = computed(() =>
    goals.value.filter(({ status }): boolean => status === 'claimed'),
  )
  const overallProgress: ComputedRef<number> = computed(() =>
    goals.value.length
      ? Math.round(
          (goals.value.filter(
            ({ status }) => status === 'completed' || status === 'claimed',
          ).length /
            goals.value.length) *
            100,
        )
      : 0,
  )

  const visibleGoals = (category: GoalCategory | 'all' = 'all'): GoalRuntimeState[] => {
    const filtered = goals.value.filter(
      ({ definition }): boolean => category === 'all' || definition.category === category,
    )
    const hiddenSequenceIds = new Set<string>()
    for (const goal of filtered) {
      if (goal.status !== 'locked') continue
      const dependency = goal.definition.requirements.find(
        (requirement) => requirement.type === 'goal-completed',
      )
      if (
        dependency &&
        filtered.some(
          (candidate) =>
            candidate.definition.id === dependency.goalId &&
            !['completed', 'claimed'].includes(candidate.status),
        )
      ) {
        hiddenSequenceIds.add(goal.definition.id)
      }
    }
    return filtered.filter(({ definition }) => !hiddenSequenceIds.has(definition.id))
  }

  const nearestGoals: ComputedRef<GoalRuntimeState[]> = computed(() =>
    [...goals.value]
      .filter(({ status }): boolean => status === 'active' || status === 'completed')
      .sort(
        (left, right): number =>
          Number(right.status === 'completed') - Number(left.status === 'completed') ||
          right.progress.current / right.progress.target -
            left.progress.current / left.progress.target ||
          left.definition.order - right.definition.order,
      )
      .slice(0, 3),
  )

  const loadPersisted = async (): Promise<void> => {
    ;[playerStates.value, counters.value] = await Promise.all([
      database.goalStates.toArray(),
      database.goalCounters.toArray(),
    ])
    isLoaded.value = true
  }

  const reconcileCompleted = (): void => {
    if (!isLoaded.value) return
    const newlyCompleted = goals.value.filter(
      ({ definition, status }): boolean =>
        status === 'completed' &&
        !playerStates.value.some(
          (state): boolean => state.goalId === definition.id && Boolean(state.completedAt),
        ),
    )
    if (!newlyCompleted.length) return
    const now = Date.now()
    const states = newlyCompleted.map(
      ({ definition }, index): GoalPlayerState => ({
        goalId: definition.id,
        completedAt: now + index,
      }),
    )
    lastCompletedGoalId.value =
      newlyCompleted[newlyCompleted.length - 1]?.definition.id
    playerStates.value = [
      ...playerStates.value.filter(
        (existing) => !states.some((state) => state.goalId === existing.goalId),
      ),
      ...states,
    ]
    reconcileQueue = reconcileQueue.then(async (): Promise<void> => {
      await database.goalStates.bulkPut(states)
    })
  }

  const refresh = async (): Promise<void> => {
    counters.value = await database.goalCounters.toArray()
    reconcileCompleted()
  }

  const claim = async (goalId: string): Promise<ClaimGoalResult> => {
    if (claimingGoalIds.value.has(goalId)) return 'already-claimed'
    const runtime = goals.value.find(({ definition }) => definition.id === goalId)
    if (!runtime || runtime.status !== 'completed') return 'not-completed'

    claimingGoalIds.value = new Set(claimingGoalIds.value).add(goalId)
    try {
      await reconcileQueue
      await player.flushSaves()
      const completedAt =
        playerStates.value.find((state) => state.goalId === goalId)?.completedAt ??
        Date.now()
      const result = await claimGoalReward(runtime.definition, completedAt)
      if (result.status === 'claimed') {
        player.applyPersistedState(result.player)
        for (const item of result.items) inventory.applyPersistedItem(item)
      }
      playerStates.value = await database.goalStates.toArray()
      return result.status
    } finally {
      const next = new Set(claimingGoalIds.value)
      next.delete(goalId)
      claimingGoalIds.value = next
    }
  }

  const handleGoalsChanged = (): void => {
    void refresh()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener(GOALS_CHANGED_EVENT, handleGoalsChanged)
    onScopeDispose(() => window.removeEventListener(GOALS_CHANGED_EVENT, handleGoalsChanged))
  }

  watch(context, reconcileCompleted, { deep: true })
  void Promise.all([collection.load(), inventory.load(), loadPersisted()]).then(
    reconcileCompleted,
  )

  return {
    goals,
    activeGoals,
    rewardGoals,
    completedGoals,
    nearestGoals,
    overallProgress,
    isLoaded,
    claimingGoalIds,
    lastCompletedGoalId,
    visibleGoals,
    claim,
    refresh,
  }
})
