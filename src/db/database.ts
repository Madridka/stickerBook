import Dexie, { type Table } from 'dexie'
import type { AlbumId, DeletedCard, StickerInstance } from '@/types'
import type { GoalCounter, GoalPlayerState } from '@/features/goals/types'
import type { RareShopState } from '@/features/rareShop/types'
import type { DailyTasksState } from '@/features/dailyTasks/types'

export const PLAYER_STATE_ID = 'current'

export interface CollectedSticker {
  // Уникальный идентификатор найденного стикера
  id: string
  // Идентификатор карточки из каталога игровых данных
  stickerId: string
  // Время добавления стикера в коллекцию
  collectedAt: number
}

export interface PlayerState {
  // Идентификатор сохранения игрока
  id: string
  // Текущий баланс coins
  coins: number
  // Текущий восстанавливаемый запас энергии для кликов
  energy: number
  // Время последнего расчёта энергии
  energyUpdatedAt: number
}

export type InventoryItemType = 'pack'

export interface InventoryItem {
  // Уникальный идентификатор предмета инвентаря
  id: string
  // Дискриминатор типа предмета для расширения модели
  type: InventoryItemType
  // Идентификатор конфигурации набора; старые записи без поля остаются стандартными.
  packId?: string
  // Журнал, карточки которого содержит блистер.
  albumId?: AlbumId
  // Страна тематического редкого блистера.
  countryId?: string
  // Время создания предмета
  createdAt: number
}

export interface PackHuntProgress {
  // Единственная запись времени последней награды за мини-игру
  id: 'cooldown'
  // Момент получения награды, от которого отсчитывается перерыв
  lastClaimedAt: number
}

export interface DuplicateExchange {
  // Единственная незавершённая сдача повторок, ожидающая выбора награды.
  id: 'pending'
  albumId: AlbumId
  candidatePlayerIds: string[]
  createdAt: number
}

export interface PackOpeningReward {
  // Заранее созданный идентификатор экземпляра делает итог открытия неизменяемым.
  instanceId: string
  albumId: AlbumId
  playerId: string
  isDuplicate: boolean
}

export interface PackOpeningSession {
  // Одновременно может существовать только одно незавершённое открытие.
  id: 'pending'
  packId: string
  blisterId: string
  albumId: AlbumId
  rewards: PackOpeningReward[]
  currentIndex: number
  animationComplete: boolean
  createdAt: number
}

export interface BlisterCooldown {
  // Идентификатор типа блистера одновременно служит первичным ключом.
  id: string
  // Время начала позволяет пересчитывать окончание при изменении mainConst.
  startedAt?: number
  nextAvailableAt: number
}

export interface GameGuideProgress {
  // Единственная запись одноразовой цепочки первых шагов.
  id: 'first-steps'
  completedStepIds: string[]
  viewedCollection: boolean
  autoPreparationShown?: boolean
  completed: boolean
  updatedAt: number
}

interface StickerBookDatabase extends Dexie {
  stickers: Table<CollectedSticker, string>
  player: Table<PlayerState, string>
  inventory: Table<InventoryItem, string>
  cards: Table<StickerInstance, string>
  duplicates: Table<StickerInstance, string>
  deletedCards: Table<DeletedCard, string>
  packHuntProgress: Table<PackHuntProgress, string>
  duplicateExchanges: Table<DuplicateExchange, string>
  packOpeningSessions: Table<PackOpeningSession, string>
  gameGuideProgress: Table<GameGuideProgress, string>
  goalStates: Table<GoalPlayerState, string>
  goalCounters: Table<GoalCounter, string>
  rareShop: Table<RareShopState, string>
  blisterCooldowns: Table<BlisterCooldown, string>
  dailyTasks: Table<DailyTasksState, string>
}

export const database: StickerBookDatabase = new Dexie('StickerBookDatabase') as StickerBookDatabase

// Настраивает последовательные версии локальной схемы Dexie
// Настраивает локальную таблицу найденных стикеров
database.version(1).stores({ stickers: 'id, collectedAt' })
database.version(2).stores({ stickers: 'id, collectedAt', player: 'id' })
database
  .version(3)
  .stores({ stickers: 'id, collectedAt', player: 'id', inventory: 'id, type, createdAt' })
database.version(4).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
})
database.version(5).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
})
database.version(6).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id, dateKey',
})
database.version(7).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id, dateKey',
  duplicateExchanges: 'id, createdAt',
})
database.version(8).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id, dateKey',
  duplicateExchanges: 'id, createdAt',
  packOpeningSessions: 'id, packId, createdAt',
})
database.version(9).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id',
  duplicateExchanges: 'id, createdAt',
  packOpeningSessions: 'id, packId, createdAt',
})
database.version(10).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id',
  duplicateExchanges: 'id, createdAt',
  packOpeningSessions: 'id, packId, createdAt',
  gameGuideProgress: 'id, completed, updatedAt',
})
database.version(11).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id',
  duplicateExchanges: 'id, createdAt',
  packOpeningSessions: 'id, packId, createdAt',
  gameGuideProgress: 'id, completed, updatedAt',
  goalStates: 'goalId, completedAt, claimedAt',
  goalCounters: 'id, updatedAt',
})
database.version(12).stores({
  stickers: 'id, collectedAt',
  player: 'id',
  inventory: 'id, type, createdAt',
  cards: 'id, playerId, location',
  duplicates: 'id, playerId, location',
  deletedCards: 'id, instanceId, playerId, deletedAt',
  packHuntProgress: 'id',
  duplicateExchanges: 'id, createdAt',
  packOpeningSessions: 'id, packId, createdAt',
  gameGuideProgress: 'id, completed, updatedAt',
  goalStates: 'goalId, completedAt, claimedAt',
  goalCounters: 'id, updatedAt',
  rareShop: 'id',
})

type LegacyStickerInstance = Omit<StickerInstance, 'albumId'> & { albumId?: AlbumId }
type LegacyDeletedCard = Omit<DeletedCard, 'albumId'> & { albumId?: AlbumId }
type LegacyInventoryItem = InventoryItem & { albumId?: AlbumId }
type LegacyDuplicateExchange = Omit<DuplicateExchange, 'albumId'> & { albumId?: AlbumId }
type LegacyPackOpeningSession = Omit<
  PackOpeningSession,
  'albumId' | 'blisterId' | 'rewards'
> & {
  albumId?: AlbumId
  blisterId?: string
  rewards: Array<Omit<PackOpeningReward, 'albumId'> & { albumId?: AlbumId }>
}

// Идемпотентно связывает все старые данные с исходным журналом WC-26.
database
  .version(13)
  .stores({
    stickers: 'id, collectedAt',
    player: 'id',
    inventory: 'id, type, albumId, packId, createdAt',
    cards: 'id, albumId, [albumId+playerId], playerId, location',
    duplicates: 'id, albumId, [albumId+playerId], playerId, location',
    deletedCards: 'id, albumId, instanceId, playerId, deletedAt',
    packHuntProgress: 'id',
    duplicateExchanges: 'id, albumId, createdAt',
    packOpeningSessions: 'id, albumId, blisterId, packId, createdAt',
    gameGuideProgress: 'id, completed, updatedAt',
    goalStates: 'goalId, completedAt, claimedAt',
    goalCounters: 'id, updatedAt',
    rareShop: 'id',
    blisterCooldowns: 'id, nextAvailableAt',
  })
  .upgrade(async (transaction): Promise<void> => {
    await transaction
      .table('cards')
      .toCollection()
      .modify((instance: LegacyStickerInstance): void => {
        instance.albumId ??= 'wc-26'
      })
    await transaction
      .table('duplicates')
      .toCollection()
      .modify((instance: LegacyStickerInstance): void => {
        instance.albumId ??= 'wc-26'
      })
    await transaction
      .table('deletedCards')
      .toCollection()
      .modify((item: LegacyDeletedCard): void => {
        item.albumId ??= 'wc-26'
      })
    await transaction
      .table('inventory')
      .toCollection()
      .modify((item: LegacyInventoryItem): void => {
        if (item.type !== 'pack') return
        item.packId ??= 'standard'
        item.albumId ??= 'wc-26'
      })
    await transaction
      .table('duplicateExchanges')
      .toCollection()
      .modify((exchange: LegacyDuplicateExchange): void => {
        exchange.albumId ??= 'wc-26'
      })
    await transaction
      .table('packOpeningSessions')
      .toCollection()
      .modify((session: LegacyPackOpeningSession): void => {
        session.albumId ??= 'wc-26'
        session.blisterId ??= 'standard'
        session.rewards = session.rewards.map((reward) => ({
          ...reward,
          albumId: reward.albumId ?? session.albumId ?? 'wc-26',
        }))
      })
  })

// Переносит сохранённую коллекцию прежнего журнала КДВ в общий журнал истории Томска.
database.version(14).upgrade(async (transaction): Promise<void> => {
  const migrateAlbumId = (item: { albumId?: AlbumId }): void => {
    if (item.albumId === 'kdv') item.albumId = 'tomsk'
  }

  await transaction.table('cards').toCollection().modify(migrateAlbumId)
  await transaction.table('duplicates').toCollection().modify(migrateAlbumId)
  await transaction.table('deletedCards').toCollection().modify(migrateAlbumId)
  await transaction.table('inventory').toCollection().modify(migrateAlbumId)
  await transaction.table('duplicateExchanges').toCollection().modify(migrateAlbumId)
  await transaction
    .table('packOpeningSessions')
    .toCollection()
    .modify((session: PackOpeningSession): void => {
      migrateAlbumId(session)
      session.rewards = session.rewards.map((reward) => ({
        ...reward,
        albumId: reward.albumId === 'kdv' ? 'tomsk' : reward.albumId,
      }))
    })
})

// Добавляет одно сохраняемое состояние текущей ротации ежедневных заданий.
database.version(15).stores({ dailyTasks: 'id, dayKey' })

// Сохраняет начало уже активных кулдаунов, чтобы их длительность определялась mainConst.
database
  .version(16)
  .stores({ blisterCooldowns: 'id, nextAvailableAt' })
  .upgrade(async (transaction): Promise<void> => {
    const inventory: InventoryItem[] = await transaction.table('inventory').toArray()
    await transaction
      .table('blisterCooldowns')
      .toCollection()
      .modify((cooldown: BlisterCooldown): void => {
        const latestPurchase: InventoryItem | undefined = inventory
          .filter((item): boolean => item.type === 'pack' && item.packId === cooldown.id)
          .sort((left, right): number => right.createdAt - left.createdAt)[0]
        cooldown.startedAt =
          latestPurchase?.createdAt ?? Math.min(Date.now(), cooldown.nextAvailableAt)
      })
  })
