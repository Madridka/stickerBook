import Dexie, { type Table } from 'dexie'

export interface CollectedSticker {
  id: string
  collectedAt: number
}

class StickerBookDatabase extends Dexie {
  stickers!: Table<CollectedSticker, string>

  constructor() {
    super('StickerBookDatabase')
    this.version(1).stores({ stickers: 'id, collectedAt' })
  }
}

export const database = new StickerBookDatabase()
