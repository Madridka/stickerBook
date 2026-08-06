import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  InventoryItem,
  PackOpeningSession,
  PlayerState,
} from '@/db/database'
import type { RareShopState } from '@/features/rareShop/types'
import { RARE_SHOP_CONFIG } from '@/config/gameBalance'

const persisted = vi.hoisted(() => ({
  rareShop: null as RareShopState | null,
  player: null as PlayerState | null,
  inventory: [] as InventoryItem[],
  opening: null as PackOpeningSession | null,
  nextId: 0,
}))

vi.mock('@/db/database', () => ({
  PLAYER_STATE_ID: 'current',
  database: {
    rareShop: {
      get: vi.fn(async (): Promise<RareShopState | undefined> => persisted.rareShop ?? undefined),
      put: vi.fn(async (state: RareShopState): Promise<void> => {
        persisted.rareShop = structuredClone(state)
      }),
    },
    player: {
      get: vi.fn(async (): Promise<PlayerState | undefined> => persisted.player ?? undefined),
      put: vi.fn(async (player: PlayerState): Promise<void> => {
        persisted.player = { ...player }
      }),
    },
    inventory: {
      add: vi.fn(async (item: InventoryItem): Promise<void> => {
        persisted.inventory.push({ ...item })
      }),
    },
    cards: {
      filter: vi.fn(() => ({
        toArray: vi.fn(async () => []),
      })),
    },
    packOpeningSessions: {
      get: vi.fn(
        async (): Promise<PackOpeningSession | undefined> => persisted.opening ?? undefined,
      ),
      add: vi.fn(async (opening: PackOpeningSession): Promise<void> => {
        persisted.opening = structuredClone(opening)
      }),
    },
    goalCounters: {
      get: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
    },
    transaction: vi.fn(
      async (...args: Array<unknown>): Promise<unknown> =>
        (args[args.length - 1] as () => Promise<unknown>)(),
    ),
  },
}))
vi.mock('@/utils/createId', () => ({
  createId: (): string => `rare-test-${persisted.nextId++}`,
}))
vi.mock('@/features/goals/goalCounterService', () => ({
  notifyGoalsChanged: vi.fn(),
}))

import { useRareShopStore } from '@/stores/rareShop'

const createState = (): RareShopState => ({
  id: 'current',
  configSignature: JSON.stringify([
    RARE_SHOP_CONFIG.price,
    RARE_SHOP_CONFIG.cardsPerPack,
    RARE_SHOP_CONFIG.missingCardChance,
    RARE_SHOP_CONFIG.offersPerRotation,
    RARE_SHOP_CONFIG.rotationDurationMs,
    RARE_SHOP_CONFIG.extensionDurationMs,
  ]),
  currentRotation: {
    id: 'rotation-1',
    generatedAt: 1_000,
    expiresAt: 10_000,
    offers: [
      {
        id: 'rotation-1:germany',
        rotationId: 'rotation-1',
        countryId: 'germany',
        price: 80,
        cardsCount: 4,
        missingCardChance: 0.8,
        generatedAt: 1_000,
        expiresAt: 10_000,
        purchasedAt: null,
        extendedUntil: null,
      },
    ],
  },
  extendedOffers: [],
  extendedOffer: null,
  lastExtensionDate: null,
  extendedOfferId: null,
  hasSeenRareShopInfo: false,
})

describe('rare shop store', () => {
  beforeEach(() => {
    persisted.rareShop = createState()
    persisted.player = {
      id: 'current',
      coins: 100,
      energy: 100,
      energyUpdatedAt: 1_000,
    }
    persisted.inventory = []
    persisted.opening = null
    persisted.nextId = 0
    setActivePinia(createPinia())
  })

  it('атомарно списывает 80 голов и резервирует ровно четыре награды', async () => {
    const store = useRareShopStore()
    const result = await store.purchaseOffer('rotation-1:germany', 2_000)

    expect(result.status).toBe('purchased')
    expect(persisted.player?.coins).toBe(20)
    expect(persisted.inventory).toHaveLength(1)
    expect(persisted.inventory[0]).toMatchObject({
      type: 'pack',
      packId: 'rare',
      countryId: 'germany',
    })
    expect(persisted.opening?.rewards).toHaveLength(4)
    expect(
      persisted.rareShop?.currentRotation?.offers[0]?.purchasedAt,
    ).toBe(2_000)
  })

  it('не списывает голы при недостаточном балансе', async () => {
    if (!persisted.player) throw new Error('Player is missing')
    persisted.player.coins = 79
    const result = await useRareShopStore().purchaseOffer('rotation-1:germany', 2_000)

    expect(result.status).toBe('insufficient-funds')
    expect(persisted.player.coins).toBe(79)
    expect(persisted.inventory).toHaveLength(0)
    expect(persisted.opening).toBeNull()
  })

  it('не позволяет повторно купить сохранённое предложение после нового store', async () => {
    const firstStore = useRareShopStore()
    expect((await firstStore.purchaseOffer('rotation-1:germany', 2_000)).status).toBe(
      'purchased',
    )

    setActivePinia(createPinia())
    const restoredStore = useRareShopStore()
    expect((await restoredStore.purchaseOffer('rotation-1:germany', 3_000)).status).toBe(
      'unavailable',
    )
    expect(persisted.player?.coins).toBe(20)
    expect(persisted.inventory).toHaveLength(1)
  })

  it('сохраняет просмотр информационного окна', async () => {
    const store = useRareShopStore()
    await store.load()
    expect(store.state.hasSeenRareShopInfo).toBe(false)

    await store.markInfoSeen()

    expect(store.state.hasSeenRareShopInfo).toBe(true)
    expect(persisted.rareShop?.hasSeenRareShopInfo).toBe(true)
  })

  it('восстанавливает незавершённую ротацию без генерации новых предложений', async () => {
    if (!persisted.rareShop?.currentRotation) throw new Error('Rotation is missing')
    persisted.rareShop.currentRotation.expiresAt = Date.now() + 60_000
    persisted.rareShop.currentRotation.offers = persisted.rareShop.currentRotation.offers.map(
      (offer) => ({ ...offer, expiresAt: persisted.rareShop?.currentRotation?.expiresAt ?? 0 }),
    )
    const store = useRareShopStore()

    await store.load()

    expect(store.state.currentRotation?.id).toBe('rotation-1')
    expect(store.currentOffers[0]?.id).toBe('rotation-1:germany')
  })

  it('после истечения создаёт новую ротацию с тремя разными странами', async () => {
    const store = useRareShopStore()

    await store.load()

    expect(store.state.currentRotation?.id).not.toBe('rotation-1')
    expect(store.currentOffers).toHaveLength(3)
    expect(new Set(store.currentOffers.map(({ countryId }): string => countryId)).size).toBe(3)
  })
})
