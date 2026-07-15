import Dexie, { type Table } from 'dexie'

export interface CollectedSticker {
  id: string
  collectedAt: number
}

export interface PlayerState {
  id: string
  coins: number
}

interface StickerBookDatabase extends Dexie {
  stickers: Table<CollectedSticker, string>
  player: Table<PlayerState, string>
}

export const database: StickerBookDatabase = new Dexie('StickerBookDatabase') as StickerBookDatabase

// Настраивает локальную таблицу найденных стикеров
database.version(1).stores({ stickers: 'id, collectedAt' })
database.version(2).stores({ stickers: 'id, collectedAt', player: 'id' })
