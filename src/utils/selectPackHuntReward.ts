import { BLISTER_CONFIGS, PACK_HUNT_REWARD_CONFIG } from '@/config/gameBalance'
import type { BlisterConfig } from '@/types/gameConfig'

export interface PackHuntReward {
  packId: string
  albumId: string
}

const getRotationIndex = (claimedAt: number, rewardCount: number): number => {
  const claimedDate = new Date(claimedAt)
  const startOfDay = new Date(claimedDate)
  startOfDay.setHours(0, 0, 0, 0)
  const elapsedTodayMs: number = Math.max(0, claimedAt - startOfDay.getTime())
  const intervalMs: number = Math.max(1, PACK_HUNT_REWARD_CONFIG.rotationIntervalMs)

  return Math.floor(elapsedTodayMs / intervalMs) % rewardCount
}

/** Выбирает настроенный блистер для текущего окна награды. */
export const selectPackHuntReward = (
  claimedAt: number,
  recentRewardPackIds: readonly string[] = [],
): PackHuntReward => {
  const configuredIds: string[] = [...new Set(PACK_HUNT_REWARD_CONFIG.blisterIds)]
  let selectedId: string | undefined

  if (PACK_HUNT_REWARD_CONFIG.selection === 'random') {
    const recentIds: Set<string> = new Set(recentRewardPackIds)
    const freshIds: string[] = configuredIds.filter((id): boolean => !recentIds.has(id))
    const lastRewardPackId: string | undefined =
      recentRewardPackIds[recentRewardPackIds.length - 1]
    const nextCycleIds: string[] = configuredIds.filter(
      (id): boolean => configuredIds.length === 1 || id !== lastRewardPackId,
    )
    const selectableIds: string[] = freshIds.length > 0 ? freshIds : nextCycleIds
    selectedId = selectableIds[Math.floor(Math.random() * selectableIds.length)]
  } else if (PACK_HUNT_REWARD_CONFIG.selection === 'rotation') {
    selectedId = configuredIds[getRotationIndex(claimedAt, configuredIds.length)]
  } else {
    selectedId = configuredIds[0]
  }

  const selectedBlister: BlisterConfig | undefined = Object.values(BLISTER_CONFIGS).find(
    ({ id }): boolean => id === selectedId,
  )
  const blister: BlisterConfig = selectedBlister ?? BLISTER_CONFIGS.standard

  return {
    packId: blister.id,
    albumId: blister.albumId,
  }
}

export const appendRecentPackHuntReward = (
  recentRewardPackIds: readonly string[],
  rewardedPackId: string,
): string[] => {
  const configuredIds: string[] = [...new Set(PACK_HUNT_REWARD_CONFIG.blisterIds)]
  const configuredIdSet: Set<string> = new Set(configuredIds)
  const validHistory: string[] = [
    ...new Set(recentRewardPackIds.filter((id): boolean => configuredIdSet.has(id))),
  ]

  if (configuredIds.length <= 1) return []
  if (validHistory.length >= configuredIds.length) return [rewardedPackId]

  return [
    ...validHistory.filter((id): boolean => id !== rewardedPackId),
    rewardedPackId,
  ]
}
