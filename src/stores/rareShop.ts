import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import {
  database,
  PLAYER_STATE_ID,
  type InventoryItem,
  type PackOpeningSession,
  type PlayerState,
} from '@/db/database'
import { CLICKER_CONFIG } from '@/data/mainConst'
import { catalogs } from '@/data/wc-26/catalog'
import type { NormalizedCardCatalog, StickerInstance } from '@/types'
import { createId } from '@/utils/createId'
import { getLocalDateKey } from '@/utils/dailyDateKey'
import {
  createCountryOfferCandidates,
  createExtendedRareShopState,
  createRareBlisterContents,
  createRareShopRotation,
  getRareOfferStatus,
} from '@/features/rareShop/rareShopDomain'
import type {
  CountryOfferCandidate,
  RareBlisterExtensionStatus,
  RareBlisterOffer,
  RareBlisterPurchaseStatus,
  RareShopState,
} from '@/features/rareShop/types'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'

export interface RareBlisterPurchaseResult {
  status: RareBlisterPurchaseStatus
  player?: PlayerState
  item?: InventoryItem
}

const createDefaultState = (): RareShopState => ({
  id: 'current',
  currentRotation: null,
  extendedOffers: [],
  extendedOffer: null,
  lastExtensionDate: null,
  extendedOfferId: null,
  hasSeenRareShopInfo: false,
})

const normalizeState = (saved: RareShopState | undefined): RareShopState => {
  const legacyExtendedOffer: RareBlisterOffer | null = saved?.extendedOffer ?? null
  return {
    ...createDefaultState(),
    ...saved,
    id: 'current',
    extendedOffers:
      saved?.extendedOffers ?? (legacyExtendedOffer ? [legacyExtendedOffer] : []),
  }
}

const roundCoins = (value: number): number => {
  const multiplier: number = 10 ** CLICKER_CONFIG.rewardPrecision
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier
}

const updateOfferInState = (
  state: RareShopState,
  offerId: string,
  update: (offer: RareBlisterOffer) => RareBlisterOffer,
): RareShopState => ({
  ...state,
  currentRotation: state.currentRotation
    ? {
        ...state.currentRotation,
        offers: state.currentRotation.offers.map(
          (offer: RareBlisterOffer): RareBlisterOffer =>
            offer.id === offerId ? update(offer) : offer,
        ),
      }
    : null,
  extendedOffer:
    state.extendedOffer?.id === offerId ? update(state.extendedOffer) : state.extendedOffer,
  extendedOffers: state.extendedOffers.map(
    (offer: RareBlisterOffer): RareBlisterOffer =>
      offer.id === offerId ? update(offer) : offer,
  ),
})

export const useRareShopStore = defineStore('rareShop', () => {
  const state: Ref<RareShopState> = ref(createDefaultState())
  const ownedCardIds: Ref<Set<string>> = ref(new Set())
  const isLoaded: Ref<boolean> = ref(false)
  const isRefreshing: Ref<boolean> = ref(false)
  const pendingOfferId: Ref<string | null> = ref(null)

  const currentOffers: ComputedRef<RareBlisterOffer[]> = computed(
    (): RareBlisterOffer[] => state.value.currentRotation?.offers ?? [],
  )
  const extendedOffer: ComputedRef<RareBlisterOffer | null> = computed(
    (): RareBlisterOffer | null => state.value.extendedOffer,
  )
  const extendedOffers: ComputedRef<RareBlisterOffer[]> = computed(
    (): RareBlisterOffer[] => state.value.extendedOffers,
  )

  // Загружает уникальные карточки игрока для весов ротации и прогресса сборных.
  const loadOwnedCards = async (): Promise<StickerInstance[]> => {
    const activeCards: StickerInstance[] = await database.cards
      .filter(({ location }: StickerInstance): boolean => location !== 'deleted')
      .toArray()
    ownedCardIds.value = new Set(
      activeCards.map(({ playerId }: StickerInstance): string => playerId),
    )
    return activeCards
  }

  // Обновляет только завершившуюся ротацию, сохраняя живое продлённое предложение.
  const refresh = async (now: number = Date.now()): Promise<void> => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
      const next: RareShopState = await database.transaction(
        'rw',
        database.rareShop,
        database.cards,
        async (): Promise<RareShopState> => {
          const saved: RareShopState | undefined = await database.rareShop.get('current')
          const activeCards: StickerInstance[] = await loadOwnedCards()
          let refreshed: RareShopState = normalizeState(saved)
          const activeExtendedOffers: RareBlisterOffer[] = refreshed.extendedOffers.filter(
            (offer: RareBlisterOffer): boolean =>
              now < (offer.extendedUntil ?? offer.expiresAt),
          )
          if (activeExtendedOffers.length !== refreshed.extendedOffers.length) {
            const latest: RareBlisterOffer | null =
              activeExtendedOffers[activeExtendedOffers.length - 1] ?? null
            refreshed = {
              ...refreshed,
              extendedOffers: activeExtendedOffers,
              extendedOffer: latest,
              extendedOfferId: latest?.id ?? null,
            }
          }

          if (!refreshed.currentRotation || now >= refreshed.currentRotation.expiresAt) {
            const candidates: CountryOfferCandidate[] = createCountryOfferCandidates(
              catalogs,
              new Set(activeCards.map(({ playerId }: StickerInstance): string => playerId)),
            )
            refreshed = {
              ...refreshed,
              currentRotation: createRareShopRotation(candidates, now, Math.random),
            }
          }

          await database.rareShop.put(refreshed)
          return refreshed
        },
      )
      state.value = next
      isLoaded.value = true
    } finally {
      isRefreshing.value = false
    }
  }

  const load = async (): Promise<void> => refresh()

  // Сохраняет просмотр справки сразу после закрытия первого модального окна.
  const markInfoSeen = async (): Promise<void> => {
    if (state.value.hasSeenRareShopInfo) return
    const next: RareShopState = await database.transaction(
      'rw',
      database.rareShop,
      async (): Promise<RareShopState> => {
        const saved: RareShopState = normalizeState(await database.rareShop.get('current'))
        const seen: RareShopState = { ...saved, hasSeenRareShopInfo: true }
        await database.rareShop.put(seen)
        return seen
      },
    )
    state.value = next
  }

  // Продлевает ровно одно доступное предложение текущей ротации.
  const extendOffer = async (
    offerId: string,
    now: number = Date.now(),
  ): Promise<RareBlisterExtensionStatus> => {
    const result = await database.transaction(
      'rw',
      database.rareShop,
      async (): Promise<{
        status: RareBlisterExtensionStatus
        state: RareShopState
      }> => {
        const saved: RareShopState = normalizeState(await database.rareShop.get('current'))
        const dateKey: string = getLocalDateKey(now)
        const extension = createExtendedRareShopState(saved, offerId, now, dateKey)
        if (extension.status === 'extended') await database.rareShop.put(extension.state)
        return extension
      },
    )
    state.value = result.state
    return result.status
  }

  // Атомарно списывает голы, резервирует награды и закрывает предложение.
  const purchaseOffer = async (
    offerId: string,
    now: number = Date.now(),
  ): Promise<RareBlisterPurchaseResult> => {
    if (pendingOfferId.value) return { status: 'unavailable' }
    pendingOfferId.value = offerId
    try {
      const result = await database.transaction(
        'rw',
        database.player,
        database.inventory,
        database.cards,
        database.packOpeningSessions,
        database.rareShop,
        database.goalCounters,
        async (): Promise<RareBlisterPurchaseResult & { state?: RareShopState }> => {
          const saved: RareShopState = normalizeState(await database.rareShop.get('current'))
          const offers: RareBlisterOffer[] = [
            ...(saved.currentRotation?.offers ?? []),
            ...saved.extendedOffers,
          ]
          const offer: RareBlisterOffer | undefined = offers.find(
            ({ id }: RareBlisterOffer): boolean => id === offerId,
          )
          if (!offer || getRareOfferStatus(offer, now) !== 'available') {
            return { status: 'unavailable', state: saved }
          }
          if (await database.packOpeningSessions.get('pending')) {
            return { status: 'opening-in-progress', state: saved }
          }

          const player: PlayerState | undefined = await database.player.get(PLAYER_STATE_ID)
          if (!player || player.coins < offer.price) {
            return { status: 'insufficient-funds', player, state: saved }
          }
          const catalog: NormalizedCardCatalog | undefined = catalogs.find(
            ({ teamId }: NormalizedCardCatalog): boolean => teamId === offer.countryId,
          )
          if (!catalog) return { status: 'unavailable', player, state: saved }

          const activeCards: StickerInstance[] = await database.cards
            .filter(({ location }: StickerInstance): boolean => location !== 'deleted')
            .toArray()
          const contents = createRareBlisterContents(
            catalog,
            activeCards,
            Math.random,
            offer.missingCardChance,
          )
          const item: InventoryItem = {
            id: createId(),
            type: 'pack',
            packId: 'rare',
            countryId: offer.countryId,
            createdAt: now,
          }
          const opening: PackOpeningSession = {
            id: 'pending',
            packId: item.id,
            rewards: contents.rewards,
            currentIndex: 0,
            animationComplete: false,
            createdAt: now,
          }
          const updatedPlayer: PlayerState = {
            ...player,
            coins: roundCoins(player.coins - offer.price),
            energy: player.energy ?? CLICKER_CONFIG.energyLimit,
            energyUpdatedAt: player.energyUpdatedAt ?? now,
          }
          const purchasedOffer: RareBlisterOffer = { ...offer, purchasedAt: now }
          const next: RareShopState = updateOfferInState(
            saved,
            offerId,
            (): RareBlisterOffer => purchasedOffer,
          )

          await database.player.put(updatedPlayer)
          await database.inventory.add(item)
          await database.packOpeningSessions.add(opening)
          await database.rareShop.put(next)
          const counter = await database.goalCounters.get('packs-purchased')
          await database.goalCounters.put({
            id: 'packs-purchased',
            value: (counter?.value ?? 0) + 1,
            updatedAt: now,
          })
          return { status: 'purchased', player: updatedPlayer, item, state: next }
        },
      )
      if (result.state) state.value = result.state
      if (result.status === 'purchased') notifyGoalsChanged()
      return result
    } finally {
      pendingOfferId.value = null
    }
  }

  const countryProgress = (
    countryId: string,
  ): { ownedCards: number; totalCards: number } => {
    const catalog: NormalizedCardCatalog | undefined = catalogs.find(
      ({ teamId }: NormalizedCardCatalog): boolean => teamId === countryId,
    )
    const totalCards: number = catalog?.cards.length ?? 0
    const ownedCards: number =
      catalog?.cards.filter(({ id }): boolean => ownedCardIds.value.has(id)).length ?? 0
    return { ownedCards, totalCards }
  }

  return {
    state,
    currentOffers,
    extendedOffer,
    extendedOffers,
    isLoaded,
    isRefreshing,
    pendingOfferId,
    load,
    refresh,
    markInfoSeen,
    extendOffer,
    purchaseOffer,
    countryProgress,
  }
})
