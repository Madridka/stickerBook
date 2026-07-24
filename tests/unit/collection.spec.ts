import { createPinia, setActivePinia } from 'pinia'
import type { StickerInstance } from '@/types'
import cards from '@/data/wc-26/catalog'

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
        quality: 100,
        location: 'inventory',
      },
      {
        id: 'special-instance',
        playerId: 'esp-20.1',
        quality: 100,
        location: 'inventory',
      },
      {
        id: 'stale-instance',
        playerId: 'removed-from-catalog',
        quality: 100,
        location: 'inventory',
      },
    ]

    const collection = useCollectionStore()
    await collection.load()

    expect(collection.total).toBe(new Set(cards.map(({ id }) => id)).size)
    expect(collection.total).toBe(961)
    expect(collection.collectedTotal).toBe(2)
  })
})
