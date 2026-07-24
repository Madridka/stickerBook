import Dexie, { type Table } from 'dexie'
import type { DeletedCard, StickerInstance } from '@/types'
import type { GoalCounter, GoalPlayerState } from '@/features/goals/types'
import type { JournalProgressRecord } from '@/features/journals/types'

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
  candidatePlayerIds: string[]
  createdAt: number
}

export interface PackOpeningReward {
  // Заранее созданный идентификатор экземпляра делает итог открытия неизменяемым.
  instanceId: string
  playerId: string
  isDuplicate: boolean
}

export interface PackOpeningSession {
  // Одновременно может существовать только одно незавершённое открытие.
  id: 'pending'
  packId: string
  rewards: PackOpeningReward[]
  currentIndex: number
  animationComplete: boolean
  createdAt: number
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
  journalProgress: Table<JournalProgressRecord, string>
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

// Исторические журналы получают собственное пространство прогресса, не меняя записи WC-26.
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
  journalProgress: 'journalId, updatedAt',
})
