import Dexie, { type Table } from 'dexie'
import type { StickerInstance } from '@/types'

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
}

export type InventoryItemType = 'pack'

export interface InventoryItem {
  // Уникальный идентификатор предмета инвентаря
  id: string
  // Дискриминатор типа предмета для расширения модели
  type: InventoryItemType
  // Время создания предмета
  createdAt: number
}

interface StickerBookDatabase extends Dexie {
  stickers: Table<CollectedSticker, string>
  player: Table<PlayerState, string>
  inventory: Table<InventoryItem, string>
  cards: Table<StickerInstance, string>
  duplicates: Table<StickerInstance, string>
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
