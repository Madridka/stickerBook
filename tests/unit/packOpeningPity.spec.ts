import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackOpeningSession } from '@/db/database'

const testState = vi.hoisted(() => {
  const cards = Array.from({ length: 100 }, (_value, index) => ({
    id: `card-${index}`,
  }))
  return {
    cards,
    ownedCards: cards.slice(0, 96).map(({ id }, index) => ({
      id: `instance-${index}`,
      albumId: 'wc-26',
      playerId: id,
      quality: 100,
      location: 'inventory',
    })),
    duplicateRewards: cards.slice(0, 5).map(({ id }, index) => ({
      instanceId: `reward-${index}`,
      albumId: 'wc-26',
      playerId: id,
      isDuplicate: true,
    })),
    addedSession: null as PackOpeningSession | null,
    registerEligiblePackOutcome: vi.fn(async () => undefined),
  }
})

vi.mock('@/db/database', () => {
  const inventory = {
    get: vi.fn(async () => ({
      id: 'pack-1',
      type: 'pack',
      packId: 'standard',
      albumId: 'wc-26',
      createdAt: 1,
    })),
    orderBy: vi.fn(),
  }
  const packOpeningSessions = {
    get: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    add: vi.fn(async (session: PackOpeningSession) => {
      testState.addedSession = structuredClone(session)
    }),
  }

  return {
    database: {
      inventory,
      cards: { toArray: vi.fn(async () => testState.ownedCards) },
      duplicates: {},
      packOpeningSessions,
      goalCounters: {},
      dailyTasks: {},
      albumPityStates: {},
      transaction: vi.fn(async (...args: unknown[]) => {
        const operation = args.at(-1) as () => Promise<unknown>
        return operation()
      }),
    },
  }
})

vi.mock('@/data/albumRegistry', () => ({
  getPlayerBlisterById: vi.fn(() => ({
    id: 'standard',
    albumId: 'wc-26',
    albumIds: ['wc-26'],
    cardCount: 5,
    poolId: 'standard',
    pityEligible: true,
    rarityOdds: { common: 100 },
  })),
  getPlayerAlbumById: vi.fn(() => ({
    id: 'wc-26',
    cards: testState.cards,
    catalogs: [],
  })),
  getPlayerAlbumCard: vi.fn(() => testState.cards[0]),
}))

vi.mock('@/features/pity/albumPityService', () => ({
  getAlbumPityContext: vi.fn(async () => ({ eligible: true, dryPackCount: 0 })),
  registerEligiblePackOutcome: testState.registerEligiblePackOutcome,
  logPityApplied: vi.fn(),
  logPityNaturalSuccess: vi.fn(),
  logPityProtectionArmed: vi.fn(),
}))

vi.mock('@/features/pity/pityDomain', () => ({
  createPityPackRewards: vi.fn(() => ({
    rewards: testState.duplicateRewards,
    hasNewCard: false,
    pityApplied: false,
  })),
  isPityPackTypeEligible: vi.fn(() => true),
  shouldProtectPack: vi.fn(() => false),
}))

vi.mock('@/db/stickerLifecycle', () => ({ storeCardInstance: vi.fn() }))
vi.mock('@/features/goals/goalCounterService', () => ({ notifyGoalsChanged: vi.fn() }))
vi.mock('@/features/dailyTasks/dailyTaskService', () => ({
  notifyDailyTasksChanged: vi.fn(),
  recordDailyTaskEventsInTransaction: vi.fn(),
}))

import { usePackOpeningStore } from '@/stores/packOpening'

describe('pack opening pity persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    testState.addedSession = null
    testState.registerEligiblePackOutcome.mockClear()
  })

  it('records an all-duplicate outcome when the opening session is created', async () => {
    const session = await usePackOpeningStore().start('pack-1')

    expect(testState.registerEligiblePackOutcome).toHaveBeenCalledOnce()
    expect(testState.registerEligiblePackOutcome).toHaveBeenCalledWith('wc-26', false)
    expect(session?.pityOutcomeRecorded).toBe(true)
    expect(testState.addedSession?.pityOutcomeRecorded).toBe(true)
  })
})
