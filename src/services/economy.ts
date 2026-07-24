import {
  database,
  PLAYER_STATE_ID,
  type InventoryItem,
  type PlayerState,
} from '@/db/database'
import { CLICKER_CONFIG } from '@/data/mainConst'
import { createId } from '@/utils/createId'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'

export interface PurchasedPackReceipt {
  status: 'purchased'
  item: InventoryItem
  player: PlayerState
}

export interface RejectedPackPurchase {
  status: 'insufficient-funds' | 'invalid-price'
  player?: PlayerState
}

export type PurchasePackResult = PurchasedPackReceipt | RejectedPackPurchase

// Сохраняет денежные значения с той же точностью, что и награды кликера.
const roundCoins = (value: number): number => {
  const multiplier: number = 10 ** CLICKER_CONFIG.rewardPrecision
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

// Атомарно списывает стоимость и создаёт пак: частичный результат невозможен.
export const purchasePack = async (price: number): Promise<PurchasePackResult> => {
  if (!Number.isFinite(price) || price <= 0) return { status: 'invalid-price' }

  const result = await database.transaction(
    'rw',
    database.player,
    database.inventory,
    database.goalCounters,
    async (): Promise<PurchasePackResult> => {
      const savedPlayer: PlayerState | undefined = await database.player.get(PLAYER_STATE_ID)
      if (!savedPlayer || savedPlayer.coins < price) {
        return { status: 'insufficient-funds', player: savedPlayer }
      }

      const player: PlayerState = {
        ...savedPlayer,
        coins: roundCoins(savedPlayer.coins - price),
        energy: savedPlayer.energy ?? CLICKER_CONFIG.energyLimit,
        energyUpdatedAt: savedPlayer.energyUpdatedAt ?? Date.now(),
      }
      const item: InventoryItem = {
        id: createId(),
        type: 'pack',
        createdAt: Date.now(),
      }

      await database.player.put(player)
      await database.inventory.add(item)
      const counter = await database.goalCounters.get('packs-purchased')
      await database.goalCounters.put({
        id: 'packs-purchased',
        value: (counter?.value ?? 0) + 1,
        updatedAt: Date.now(),
      })
      return { status: 'purchased', item, player }
    },
  )
  if (result.status === 'purchased') notifyGoalsChanged()
  return result
}
