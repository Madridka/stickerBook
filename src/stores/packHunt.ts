import { computed, onScopeDispose, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database, type InventoryItem, type PackHuntProgress } from '@/db/database'
import gameData from '@/data/mainConst.json'
import { createId } from '@/utils/createId'

export type PackHuntClaimResult = 'claimed' | 'cooldown-active'

const PROGRESS_ID: PackHuntProgress['id'] = 'cooldown'

export const usePackHuntStore = defineStore('packHunt', () => {
  const lastClaimedAt: Ref<number> = ref(0)
  const currentTime: Ref<number> = ref(Date.now())
  const isLoaded: Ref<boolean> = ref(false)
  const isClaiming: Ref<boolean> = ref(false)
  const cooldownMs: number = gameData.packHunt.cooldownMs
  const cooldownRemainingMs: ComputedRef<number> = computed((): number =>
    Math.max(0, lastClaimedAt.value + cooldownMs - currentTime.value),
  )
  const canPlay: ComputedRef<boolean> = computed(
    (): boolean => isLoaded.value && cooldownRemainingMs.value === 0 && !isClaiming.value,
  )

  // Обновляет обратный отсчёт и сам открывает следующую игру по завершении паузы.
  const countdownInterval: number = window.setInterval((): void => {
    currentTime.value = Date.now()
  }, 1000)
  onScopeDispose((): void => window.clearInterval(countdownInterval))

  const load = async (): Promise<void> => {
    const progress: PackHuntProgress | undefined = await database.packHuntProgress.get(PROGRESS_ID)
    lastClaimedAt.value = progress?.lastClaimedAt ?? 0
    currentTime.value = Date.now()
    isLoaded.value = true
  }

  // Атомарно проверяет четырёхчасовую паузу, выдаёт набор и начинает новый отсчёт.
  const claimReward = async (): Promise<PackHuntClaimResult> => {
    if (isClaiming.value) return 'cooldown-active'
    isClaiming.value = true

    try {
      const result: PackHuntClaimResult = await database.transaction(
        'rw',
        database.packHuntProgress,
        database.inventory,
        async (): Promise<PackHuntClaimResult> => {
          const claimedAt: number = Date.now()
          const saved: PackHuntProgress | undefined =
            await database.packHuntProgress.get(PROGRESS_ID)

          if (saved && claimedAt < saved.lastClaimedAt + cooldownMs) return 'cooldown-active'

          const item: InventoryItem = {
            id: createId(),
            type: 'pack',
            createdAt: claimedAt,
          }
          const progress: PackHuntProgress = {
            id: PROGRESS_ID,
            lastClaimedAt: claimedAt,
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
    lastClaimedAt,
    cooldownMs,
    cooldownRemainingMs,
    isLoaded,
    isClaiming,
    canPlay,
    load,
    claimReward,
  }
})
