import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StickerInstance } from '@/types'

const testState = vi.hoisted(() => ({
  card: undefined as StickerInstance | undefined,
  duplicate: undefined as StickerInstance | undefined,
  cardsAdd: vi.fn(async () => undefined),
  duplicatesAdd: vi.fn(async () => undefined),
  registerCardAcquisition: vi.fn(async () => undefined),
}))

vi.mock('@/db/database', () => ({
  database: {
    cards: {
      get: vi.fn(async () => testState.card),
      add: testState.cardsAdd,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({ first: vi.fn(async () => undefined) })),
        })),
      })),
    },
    duplicates: {
      get: vi.fn(async () => testState.duplicate),
      add: testState.duplicatesAdd,
    },
  },
}))

vi.mock('@/data/albumRegistry', () => ({
  getPlayerAlbumById: vi.fn(() => ({ cards: [{ id: 'irq-14' }] })),
}))

vi.mock('@/features/pity/albumPityService', () => ({
  registerCardAcquisition: testState.registerCardAcquisition,
  resetAlbumPity: vi.fn(async () => undefined),
}))

import { storeCardInstance } from '@/db/stickerLifecycle'

const persistedCard: StickerInstance = {
  id: 'reward-1',
  albumId: 'wc-26',
  playerId: 'irq-14',
  quality: 100,
  location: 'inventory',
}

describe('storeCardInstance', () => {
  beforeEach(() => {
    testState.card = undefined
    testState.duplicate = undefined
    testState.cardsAdd.mockClear()
    testState.duplicatesAdd.mockClear()
    testState.registerCardAcquisition.mockClear()
  })

  it('returns an already persisted reward instead of inserting it twice', async () => {
    testState.card = persistedCard

    const stored = await storeCardInstance('wc-26', 'irq-14', 'reward-1')

    expect(stored).toBe(persistedCard)
    expect(testState.cardsAdd).not.toHaveBeenCalled()
    expect(testState.duplicatesAdd).not.toHaveBeenCalled()
    expect(testState.registerCardAcquisition).not.toHaveBeenCalled()
  })

  it('also resumes safely when the reward was persisted as a duplicate', async () => {
    testState.duplicate = { ...persistedCard, location: 'duplicate' }

    const stored = await storeCardInstance('wc-26', 'irq-14', 'reward-1')

    expect(stored.location).toBe('duplicate')
    expect(testState.cardsAdd).not.toHaveBeenCalled()
    expect(testState.duplicatesAdd).not.toHaveBeenCalled()
    expect(testState.registerCardAcquisition).not.toHaveBeenCalled()
  })
})
