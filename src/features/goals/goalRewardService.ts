import {
  database,
  PLAYER_STATE_ID,
  type InventoryItem,
  type PlayerState,
} from '@/db/database'
import { CLICKER_CONFIG } from '@/data/mainConst'
import { createId } from '@/utils/createId'
import type { GoalDefinition, GoalPlayerState } from './types'

export type ClaimGoalRewardResult =
  | { status: 'claimed'; player: PlayerState; items: InventoryItem[] }
  | { status: 'already-claimed' | 'not-completed' }

const roundCoins = (value: number): number => {
  const multiplier = 10 ** CLICKER_CONFIG.rewardPrecision
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

export const claimGoalReward = async (
  definition: GoalDefinition,
  completedAt: number | undefined,
): Promise<ClaimGoalRewardResult> =>
  database.transaction(
    'rw',
    database.goalStates,
    database.player,
    database.inventory,
    async (): Promise<ClaimGoalRewardResult> => {
      const state = await database.goalStates.get(definition.id)
      if (state?.claimedAt) return { status: 'already-claimed' }
      if (!state?.completedAt && !completedAt) return { status: 'not-completed' }

      const now = Date.now()
      const savedPlayer = await database.player.get(PLAYER_STATE_ID)
      let player: PlayerState = savedPlayer ?? {
        id: PLAYER_STATE_ID,
        coins: 0,
        energy: CLICKER_CONFIG.energyLimit,
        energyUpdatedAt: now,
      }
      const items: InventoryItem[] = []

      for (const reward of definition.reward) {
        if (reward.type === 'coins') {
          player = { ...player, coins: roundCoins(player.coins + reward.amount) }
        } else if (reward.type === 'energy') {
          player = {
            ...player,
            energy: Math.min(CLICKER_CONFIG.energyLimit, player.energy + reward.amount),
            energyUpdatedAt: now,
          }
        } else {
          for (let index = 0; index < reward.amount; index += 1) {
            items.push({
              id: createId(),
              type: 'pack',
              packId: reward.packId,
              createdAt: now + index,
            })
          }
        }
      }

      const claimedState: GoalPlayerState = {
        goalId: definition.id,
        completedAt: state?.completedAt ?? completedAt ?? now,
        claimedAt: now,
      }
      await database.player.put(player)
      if (items.length) await database.inventory.bulkAdd(items)
      await database.goalStates.put(claimedState)
      return { status: 'claimed', player, items }
    },
  )
