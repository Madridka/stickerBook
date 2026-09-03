import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import {
  database,
  type PickDraft,
  type PickWalletState,
} from '@/db/database'
import { storeCardInstance } from '@/db/stickerLifecycle'
import { getAlbumCard, getPlayerAlbums } from '@/data/albumRegistry'
import {
  PACK_CONFIGS,
  PICK_SHOP_CONFIG,
  PICK_SHOP_OFFERS,
} from '@/config/gameBalance'
import { notifyGoalsChanged } from '@/features/goals/goalCounterService'
import { useCollectionStore } from '@/stores/collection'
import {
  createPickCandidates,
  isPackCard,
  type PickPoolCard,
} from '@/utils/createPickCandidates'
import type {
  CardRarity,
  PickCandidateRef,
  PickShopOffer,
  StickerInstance,
} from '@/types'

export type StartPickResult = 'started' | 'insufficient-tokens' | 'not-enough-duplicates' | 'completed' | 'pending-exists'
export type ClaimPickResult = 'claimed' | 'invalid-choice'

const rarityRank: Readonly<Record<CardRarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

const randomGuaranteeAt = (): number => {
  const { randomPityMinDryPicks: min, randomPityMaxDryPicks: max } = PICK_SHOP_CONFIG
  return min + Math.floor(Math.random() * (max - min + 1))
}

const defaultWallet = (): PickWalletState => ({
  id: 'wallet',
  tokens: 0,
  randomDryPickCount: 0,
  randomGuaranteeAt: randomGuaranteeAt(),
  updatedAt: Date.now(),
})

const candidateKey = ({ albumId, playerId }: PickCandidateRef): string =>
  `${albumId}:${playerId}`

const allPackCards = (): PickPoolCard[] =>
  getPlayerAlbums()
    .flatMap((album): PickPoolCard[] =>
      album.cards.map((card): PickPoolCard => ({ albumId: album.id, card })),
    )
    .filter(isPackCard)

const getOfferPool = (offer: PickShopOffer): PickPoolCard[] => {
  const pool: PickPoolCard[] = allPackCards()
  if (offer.kind === 'album') {
    return pool.filter(({ albumId }): boolean => albumId === offer.albumId)
  }
  if (offer.kind === 'premium') {
    return pool.filter(
      ({ card }): boolean =>
        PICK_SHOP_CONFIG.premiumRarities.includes(card.rarity) || card.series !== 'base',
    )
  }
  return pool
}

const getOfferOdds = (offer: PickShopOffer): Readonly<Record<CardRarity, number>> => {
  if (offer.kind === 'album') {
    return PICK_SHOP_CONFIG.journalRarityOdds
  }
  if (offer.kind === 'premium') {
    return PICK_SHOP_CONFIG.premiumRarityOdds
  }
  return PACK_CONFIGS.standard.rarityOdds
}

const selectDisposableDuplicates = (
  duplicates: StickerInstance[],
  count: number,
): StickerInstance[] =>
  [...duplicates]
    .sort((left, right): number => {
      const leftCard = getAlbumCard(left.albumId, left.playerId)
      const rightCard = getAlbumCard(right.albumId, right.playerId)
      const rarityDifference: number =
        rarityRank[leftCard?.rarity ?? 'common'] - rarityRank[rightCard?.rarity ?? 'common']
      return rarityDifference || left.id.localeCompare(right.id)
    })
    .slice(0, count)

export const usePickShopStore = defineStore('pickShop', () => {
  const collection = useCollectionStore()
  const wallet: Ref<PickWalletState> = ref(defaultWallet())
  const pendingDraft: Ref<PickDraft | undefined> = ref(undefined)
  const isLoaded: Ref<boolean> = ref(false)
  const isProcessing: Ref<boolean> = ref(false)
  const sortedOffers: readonly PickShopOffer[] = [...PICK_SHOP_OFFERS].sort(
    (left, right): number => left.priority - right.priority || left.cost - right.cost,
  )

  const load = async (): Promise<void> => {
    const [storedWallet, draft] = await Promise.all([
      database.pickWallet.get('wallet'),
      database.pickDrafts.get('pending'),
    ])
    wallet.value = storedWallet ?? defaultWallet()
    if (!storedWallet) await database.pickWallet.put(wallet.value)
    pendingDraft.value = draft
    isLoaded.value = true
  }

  // Реактивно сверяет предложения магазина с актуальной коллекцией игрока.
  const ownedKeys: ComputedRef<Set<string>> = computed(() =>
    new Set(
      collection.items
        .filter(({ instance }): boolean => instance.location !== 'deleted')
        .map(({ instance: { albumId, playerId } }): string => `${albumId}:${playerId}`),
    ),
  )

  const offerMissingCounts: ComputedRef<Record<string, number>> = computed(() =>
    Object.fromEntries(
      PICK_SHOP_OFFERS.map((offer): [string, number] => [
        offer.id,
        getOfferPool(offer).filter(
          ({ albumId, card }): boolean => !ownedKeys.value.has(`${albumId}:${card.id}`),
        ).length,
      ]),
    ),
  )

  // Списывает выбранную валюту и фиксирует кандидатов одной транзакцией.
  const createDraft = async (
    offer: PickShopOffer,
    payment: 'tokens' | 'duplicates',
  ): Promise<StartPickResult> => {
    if (isProcessing.value) return 'pending-exists'
    isProcessing.value = true
    try {
      const result: StartPickResult = await database.transaction(
        'rw',
        [
          database.pickWallet,
          database.pickDrafts,
          database.duplicates,
          database.cards,
          database.goalCounters,
        ],
        async (): Promise<StartPickResult> => {
          if (await database.pickDrafts.get('pending')) return 'pending-exists'
          const persistedWallet: PickWalletState =
            (await database.pickWallet.get('wallet')) ?? defaultWallet()
          const duplicates: StickerInstance[] = await database.duplicates.toArray()
          if (payment === 'tokens' && persistedWallet.tokens < offer.cost) {
            return 'insufficient-tokens'
          }
          if (payment === 'duplicates' && duplicates.length < PICK_SHOP_CONFIG.duplicatesPerToken) {
            return 'not-enough-duplicates'
          }

          const cards: StickerInstance[] = await database.cards.toArray()
          const persistedOwnedKeys: Set<string> = new Set(
            cards
              .filter(({ location }): boolean => location !== 'deleted')
              .map(({ albumId, playerId }): string => `${albumId}:${playerId}`),
          )
          const pool: PickPoolCard[] = getOfferPool(offer)
          const hasMissing: boolean = pool.some(
            ({ albumId, card }): boolean => !persistedOwnedKeys.has(`${albumId}:${card.id}`),
          )
          if (offer.kind === 'album' && !hasMissing) return 'completed'

          const pityGuarantee: boolean =
            offer.kind === 'random' &&
            hasMissing &&
            persistedWallet.randomDryPickCount + 1 >= persistedWallet.randomGuaranteeAt
          const candidates: PickCandidateRef[] = createPickCandidates(
            pool,
            PICK_SHOP_CONFIG.candidateCount,
            getOfferOdds(offer),
            persistedOwnedKeys,
            offer.guaranteedNew || pityGuarantee,
          )
          if (candidates.length === 0) return 'completed'

          const containsNew: boolean = candidates.some(
            (candidate): boolean => !persistedOwnedKeys.has(candidateKey(candidate)),
          )
          const timestamp: number = Date.now()
          const nextWallet: PickWalletState = {
            ...persistedWallet,
            tokens: payment === 'tokens'
              ? Math.max(0, persistedWallet.tokens - offer.cost)
              : persistedWallet.tokens,
            randomDryPickCount: offer.kind === 'random'
              ? containsNew ? 0 : persistedWallet.randomDryPickCount + 1
              : persistedWallet.randomDryPickCount,
            randomGuaranteeAt:
              offer.kind === 'random' && containsNew
                ? randomGuaranteeAt()
                : persistedWallet.randomGuaranteeAt,
            updatedAt: timestamp,
          }
          const draft: PickDraft = {
            id: 'pending',
            offerId: offer.id,
            candidates,
            guaranteedNew: offer.guaranteedNew || pityGuarantee,
            createdAt: timestamp,
            updatedAt: timestamp,
          }

          if (payment === 'duplicates') {
            const spent: StickerInstance[] = selectDisposableDuplicates(
              duplicates,
              PICK_SHOP_CONFIG.duplicatesPerToken,
            )
            await database.duplicates.bulkDelete(spent.map(({ id }): string => id))
            const counter = await database.goalCounters.get('duplicates-exchanged')
            await database.goalCounters.put({
              id: 'duplicates-exchanged',
              value: (counter?.value ?? 0) + 1,
              updatedAt: timestamp,
            })
          }
          await database.pickWallet.put(nextWallet)
          await database.pickDrafts.put(draft)
          return 'started'
        },
      )
      await load()
      if (result === 'started' && payment === 'duplicates') notifyGoalsChanged()
      return result
    } finally {
      isProcessing.value = false
    }
  }

  const beginPick = async (offerId: string): Promise<StartPickResult> => {
    const offer: PickShopOffer | undefined = PICK_SHOP_OFFERS.find(
      ({ id }): boolean => id === offerId,
    )
    return offer ? createDraft(offer, 'tokens') : 'completed'
  }

  const openMixedPickWithDuplicates = async (): Promise<StartPickResult> => {
    const offer: PickShopOffer | undefined = PICK_SHOP_OFFERS.find(
      ({ id }): boolean => id === 'random',
    )
    return offer ? createDraft(offer, 'duplicates') : 'completed'
  }

  // Сначала определяет реально доступное кратное количество, затем начисляет жетоны.
  const convertDuplicates = async (requestedCount: number): Promise<number> => {
    if (isProcessing.value) return 0
    const normalizedCount: number =
      Math.floor(Math.max(0, requestedCount) / PICK_SHOP_CONFIG.duplicatesPerToken) *
      PICK_SHOP_CONFIG.duplicatesPerToken
    if (normalizedCount === 0) return 0
    isProcessing.value = true
    try {
      const earned: number = await database.transaction(
        'rw',
        [database.pickWallet, database.duplicates, database.goalCounters],
        async (): Promise<number> => {
          const duplicates: StickerInstance[] = await database.duplicates.toArray()
          const spent: StickerInstance[] = selectDisposableDuplicates(duplicates, normalizedCount)
          const spendCount: number =
            Math.floor(spent.length / PICK_SHOP_CONFIG.duplicatesPerToken) *
            PICK_SHOP_CONFIG.duplicatesPerToken
          if (spendCount === 0) return 0
          const tokenCount: number = spendCount / PICK_SHOP_CONFIG.duplicatesPerToken
          const persistedWallet: PickWalletState =
            (await database.pickWallet.get('wallet')) ?? defaultWallet()
          const timestamp: number = Date.now()
          await database.duplicates.bulkDelete(
            spent.slice(0, spendCount).map(({ id }): string => id),
          )
          await database.pickWallet.put({
            ...persistedWallet,
            tokens: persistedWallet.tokens + tokenCount,
            updatedAt: timestamp,
          })
          const counter = await database.goalCounters.get('duplicates-exchanged')
          await database.goalCounters.put({
            id: 'duplicates-exchanged',
            value: (counter?.value ?? 0) + tokenCount,
            updatedAt: timestamp,
          })
          return tokenCount
        },
      )
      if (earned > 0) notifyGoalsChanged()
      await load()
      return earned
    } finally {
      isProcessing.value = false
    }
  }

  // Проверяет выбор по сохранённому draft, чтобы нельзя было подменить карточку из UI.
  const claimPick = async (candidate: PickCandidateRef): Promise<ClaimPickResult> => {
    if (isProcessing.value) return 'invalid-choice'
    isProcessing.value = true
    try {
      const result: ClaimPickResult = await database.transaction(
        'rw',
        [database.cards, database.duplicates, database.pickDrafts, database.albumPityStates],
        async (): Promise<ClaimPickResult> => {
          const draft: PickDraft | undefined = await database.pickDrafts.get('pending')
          if (
            !draft?.candidates.some(
              (item): boolean => candidateKey(item) === candidateKey(candidate),
            )
          ) {
            return 'invalid-choice'
          }
          await storeCardInstance(candidate.albumId, candidate.playerId)
          await database.pickDrafts.delete('pending')
          return 'claimed'
        },
      )
      await load()
      return result
    } finally {
      isProcessing.value = false
    }
  }

  void load()

  return {
    wallet,
    tokens: computed((): number => wallet.value.tokens),
    pendingDraft,
    ownedKeys,
    offers: sortedOffers,
    offerMissingCounts,
    isLoaded,
    isProcessing,
    beginPick,
    claimPick,
    convertDuplicates,
    load,
    openMixedPickWithDuplicates,
  }
})
