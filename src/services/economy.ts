import {
  database,
  PLAYER_STATE_ID,
  type InventoryItem,
  type PlayerState,
} from '@/db/database'
import { BLISTER_CONFIGS, CLICKER_CONFIG, DROP_ENGINE_CONFIG } from '@/data/mainConst'
import { getPlayerAlbumById, getPlayerBlisterById } from '@/data/albumRegistry'
import { createId } from '@/utils/createId'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'
import { selectCardV2 } from '@/utils/dropEngine'
import type {
  PackOpeningReward,
  PackOpeningSession,
} from '@/db/database'
import type { CardDefinition, StickerInstance } from '@/types'

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

export interface PurchasedBlisterReceipt {
  status: 'purchased'
  item: InventoryItem
  player: PlayerState
  session: PackOpeningSession
}

export interface RejectedBlisterPurchase {
  status:
    | 'unknown-blister'
    | 'empty-album'
    | 'cooldown'
    | 'insufficient-funds'
    | 'opening-in-progress'
  player?: PlayerState
  nextAvailableAt?: number
}

export type PurchaseBlisterResult = PurchasedBlisterReceipt | RejectedBlisterPurchase

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
        packId: BLISTER_CONFIGS.standard.id,
        albumId: BLISTER_CONFIGS.standard.albumId,
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

// Проверяет, оплачивает и резервирует содержимое блистера одной транзакцией.
export const purchaseBlister = async (
  blisterId: string,
  now: number = Date.now(),
): Promise<PurchaseBlisterResult> => {
  const blister = getPlayerBlisterById(blisterId)
  if (!blister) return { status: 'unknown-blister' }
  const album = getPlayerAlbumById(blister.albumId)
  if (!album?.cards.length || !album.catalogs.length) return { status: 'empty-album' }

  const result: PurchaseBlisterResult = await database.transaction(
    'rw',
    [
      database.player,
      database.inventory,
      database.cards,
      database.packOpeningSessions,
      database.blisterCooldowns,
      database.goalCounters,
    ],
    async (): Promise<PurchaseBlisterResult> => {
      const pendingSession: PackOpeningSession | undefined =
        await database.packOpeningSessions.get('pending')
      if (pendingSession && getPlayerAlbumById(pendingSession.albumId)) {
        return { status: 'opening-in-progress' }
      }
      if (pendingSession) await database.packOpeningSessions.delete('pending')
      const cooldown = await database.blisterCooldowns.get(blister.id)
      if (cooldown && cooldown.nextAvailableAt > now) {
        return {
          status: 'cooldown',
          nextAvailableAt: cooldown.nextAvailableAt,
        }
      }
      const savedPlayer: PlayerState | undefined = await database.player.get(PLAYER_STATE_ID)
      if (!savedPlayer || savedPlayer.coins < blister.cost) {
        return { status: 'insufficient-funds', player: savedPlayer }
      }

      const activeCards: StickerInstance[] = await database.cards
        .where('albumId')
        .equals(album.id)
        .filter(({ location }): boolean => location !== 'deleted')
        .toArray()
      const ownedCardIds: Set<string> = new Set(
        activeCards.map(({ playerId }): string => playerId),
      )
      const rewards: PackOpeningReward[] = Array.from(
        { length: blister.cardCount },
        (): PackOpeningReward => {
          const card: CardDefinition = selectCardV2({
            catalogs: album.catalogs,
            packConfig: {
              cardsPerPack: blister.cardCount,
              rarityOdds: blister.rarityOdds,
            },
            poolId: blister.poolId,
            defaultSelectionWeight: DROP_ENGINE_CONFIG.defaultSelectionWeight,
            randomSource: Math.random,
          }) as CardDefinition
          const isDuplicate: boolean = ownedCardIds.has(card.id)
          ownedCardIds.add(card.id)
          return {
            instanceId: createId(),
            albumId: album.id,
            playerId: card.id,
            isDuplicate,
          }
        },
      )
      const item: InventoryItem = {
        id: createId(),
        type: 'pack',
        packId: blister.id,
        albumId: album.id,
        createdAt: now,
      }
      const session: PackOpeningSession = {
        id: 'pending',
        packId: item.id,
        blisterId: blister.id,
        albumId: album.id,
        rewards,
        currentIndex: 0,
        animationComplete: false,
        createdAt: now,
      }
      const player: PlayerState = {
        ...savedPlayer,
        coins: roundCoins(savedPlayer.coins - blister.cost),
        energy: savedPlayer.energy ?? CLICKER_CONFIG.energyLimit,
        energyUpdatedAt: savedPlayer.energyUpdatedAt ?? now,
      }

      await database.player.put(player)
      await database.inventory.add(item)
      await database.packOpeningSessions.add(session)
      if (blister.cooldownMs > 0) {
        await database.blisterCooldowns.put({
          id: blister.id,
          nextAvailableAt: now + blister.cooldownMs,
        })
      }
      const counter = await database.goalCounters.get('packs-purchased')
      await database.goalCounters.put({
        id: 'packs-purchased',
        value: (counter?.value ?? 0) + 1,
        updatedAt: now,
      })
      return { status: 'purchased', item, player, session }
    },
  )

  if (result.status === 'purchased') notifyGoalsChanged()
  return result
}
