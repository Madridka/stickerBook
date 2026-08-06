import { createPinia, setActivePinia } from 'pinia'
import type { StickerInstance } from '@/types'
import { getPlayerAlbums } from '@/data/albumRegistry'

const databaseState = vi.hoisted(() => ({
  cards: [] as StickerInstance[],
}))

vi.mock('@/db/database', () => ({
  database: {
    cards: {
      toArray: vi.fn(async (): Promise<StickerInstance[]> => databaseState.cards),
    },
    duplicates: {
      toArray: vi.fn(async (): Promise<StickerInstance[]> => []),
    },
    duplicateExchanges: {
      get: vi.fn(async () => undefined),
    },
  },
}))

vi.mock('@/db/stickerLifecycle', () => ({
  reconcileOrphanedDuplicates: vi.fn(async () => undefined),
}))

import { useCollectionStore } from '@/stores/collection'

describe('collection store', () => {
  beforeEach(() => {
    databaseState.cards = []
    setActivePinia(createPinia())
  })

  it('считает специальные версии отдельными карточками коллекции', async () => {
    databaseState.cards = [
      {
        id: 'base-instance',
        playerId: 'esp-20',
        albumId: 'wc-26',
        quality: 100,
        location: 'inventory',
      },
      {
        id: 'special-instance',
        playerId: 'esp-20.1',
        albumId: 'wc-26',
        quality: 100,
        location: 'inventory',
      },
      {
        id: 'stale-instance',
        playerId: 'removed-from-catalog',
        albumId: 'wc-26',
        quality: 100,
        location: 'inventory',
      },
    ]

    const collection = useCollectionStore()
    await collection.load()

    const totalCards: number = getPlayerAlbums().reduce(
      (total, album): number => total + album.cards.length,
      0,
    )
    expect(collection.total).toBe(totalCards)
    expect(collection.collectedTotal).toBe(2)
  })
})
