import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type InventoryItem, type PackHuntProgress } from '@/db/database'
import gameData from '@/data/mainConst.json'
import { createId } from '@/utils/createId'

export type PackHuntClaimResult = 'claimed' | 'limit-reached'

const PROGRESS_ID: PackHuntProgress['id'] = 'daily'

// Формирует локальную календарную дату без зависимости от формата браузера.
const getDateKey = (date: Date = new Date()): string => {
  const year: number = date.getFullYear()
  const month: string = String(date.getMonth() + 1).padStart(2, '0')
  const day: string = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const usePackHuntStore = defineStore('packHunt', () => {
  const completedToday: Ref<number> = ref(0)
  const isLoaded: Ref<boolean> = ref(false)
  const isClaiming: Ref<boolean> = ref(false)
  const dailyLimit: number = gameData.packHunt.dailyLimit
  const remainingToday: ComputedRef<number> = computed((): number =>
    Math.max(0, dailyLimit - completedToday.value),
  )
  const canPlay: ComputedRef<boolean> = computed(
    (): boolean => isLoaded.value && remainingToday.value > 0 && !isClaiming.value,
  )

  // Загружает только счётчик текущего локального дня, автоматически сбрасывая прошлую дату.
  const load = async (): Promise<void> => {
    const progress: PackHuntProgress | undefined = await database.packHuntProgress.get(PROGRESS_ID)
    completedToday.value = progress?.dateKey === getDateKey() ? progress.completed : 0
    isLoaded.value = true
  }

  // Атомарно выдаёт набор и расходует одну дневную награду.
  const claimReward = async (): Promise<PackHuntClaimResult> => {
    if (isClaiming.value) return 'limit-reached'
    isClaiming.value = true

    try {
      const result: PackHuntClaimResult = await database.transaction(
        'rw',
        database.packHuntProgress,
        database.inventory,
        async (): Promise<PackHuntClaimResult> => {
          const dateKey: string = getDateKey()
          const saved: PackHuntProgress | undefined =
            await database.packHuntProgress.get(PROGRESS_ID)
          const completed: number = saved?.dateKey === dateKey ? saved.completed : 0

          if (completed >= dailyLimit) return 'limit-reached'

          const item: InventoryItem = {
            id: createId(),
            type: 'pack',
            createdAt: Date.now(),
          }
          const progress: PackHuntProgress = {
            id: PROGRESS_ID,
            dateKey,
            completed: completed + 1,
          }

          await database.inventory.add(item)
          await database.packHuntProgress.put(progress)
          return 'claimed'
        },
      )

      await load()
      return result
    } finally {
      isClaiming.value = false
    }
  }

  void load()

  return {
    completedToday,
    dailyLimit,
    remainingToday,
    isLoaded,
    isClaiming,
    canPlay,
    load,
    claimReward,
  }
})
