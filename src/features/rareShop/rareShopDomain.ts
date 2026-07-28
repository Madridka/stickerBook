import { DROP_ENGINE_CONFIG, PACK_CONFIGS, RARE_SHOP_CONFIG } from '@/data/mainConst'
import type {
  CardDefinition,
  CardRarity,
  NormalizedCardCatalog,
  StickerInstance,
} from '@/types'
import { createId } from '@/utils/createId'
import { selectCardV2, type RandomSource } from '@/utils/dropEngine'
import type {
  CountryOfferCandidate,
  RareBlisterContents,
  RareBlisterExtensionStatus,
  RareBlisterOffer,
  RareBlisterOfferStatus,
  RareShopRotation,
  RareShopState,
} from './types'

const rarityWeight: Record<CardRarity, number> = PACK_CONFIGS.standard.rarityOdds

const getRandomUnit = (randomSource: RandomSource): number => {
  const value: number = randomSource()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a finite value in the [0, 1) range')
  }
  return value
}

const selectWeighted = <T>(
  values: readonly T[],
  getWeight: (value: T) => number,
  randomSource: RandomSource,
): T => {
  const totalWeight: number = values.reduce(
    (total: number, value: T): number => total + getWeight(value),
    0,
  )
  if (!values.length || totalWeight <= 0) throw new Error('Weighted pool is empty')

  let cursor: number = getRandomUnit(randomSource) * totalWeight
  for (const value of values) {
    cursor -= getWeight(value)
    if (cursor < 0) return value
  }
  return values[values.length - 1] as T
}

const shuffle = <T>(values: readonly T[], randomSource: RandomSource): T[] => {
  const result: T[] = [...values]
  for (let index: number = result.length - 1; index > 0; index -= 1) {
    const target: number = Math.floor(getRandomUnit(randomSource) * (index + 1))
    ;[result[index], result[target]] = [result[target] as T, result[index] as T]
  }
  return result
}

// Выполняет единственный guarantee-roll для всего блистера.
export const shouldGuaranteeMissingCard = (
  randomValue: number,
  chance: number,
): boolean => {
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) return false
  if (!Number.isFinite(chance) || chance <= 0) return false
  return randomValue < Math.min(1, chance)
}

// Рассчитывает вес страны по реальному каталогу и текущим уникальным карточкам игрока.
export const createCountryOfferCandidates = (
  catalogs: readonly NormalizedCardCatalog[],
  ownedCardIds: ReadonlySet<string>,
): CountryOfferCandidate[] =>
  catalogs
    .filter((catalog: NormalizedCardCatalog): boolean => catalog.cards.length > 0)
    .map((catalog: NormalizedCardCatalog): CountryOfferCandidate => {
      const totalCards: number = catalog.cards.length
      const ownedCards: number = catalog.cards.filter(({ id }): boolean =>
        ownedCardIds.has(id),
      ).length
      const missingCards: number = totalCards - ownedCards
      const completionRatio: number = totalCards ? ownedCards / totalCards : 0
      return {
        countryId: catalog.teamId,
        totalCards,
        ownedCards,
        missingCards,
        weight: missingCards === 0 ? 1 : 8 + completionRatio * 18 + 4 / missingCards,
      }
    })

// Выбирает разные страны без возвращения уже выбранной страны в пул.
export const selectOfferCountries = (
  candidates: readonly CountryOfferCandidate[],
  count: number,
  randomSource: RandomSource,
): CountryOfferCandidate[] => {
  const pool: CountryOfferCandidate[] = [...candidates]
  const selected: CountryOfferCandidate[] = []
  while (pool.length && selected.length < count) {
    const candidate: CountryOfferCandidate = selectWeighted(
      pool,
      ({ weight }: CountryOfferCandidate): number => weight,
      randomSource,
    )
    selected.push(candidate)
    pool.splice(
      pool.findIndex(({ countryId }): boolean => countryId === candidate.countryId),
      1,
    )
  }
  return selected
}

export const createRareShopRotation = (
  candidates: readonly CountryOfferCandidate[],
  now: number,
  randomSource: RandomSource,
): RareShopRotation => {
  const id: string = `${now}-${createId()}`
  const expiresAt: number = now + RARE_SHOP_CONFIG.rotationDurationMs
  const offers: RareBlisterOffer[] = selectOfferCountries(
    candidates,
    RARE_SHOP_CONFIG.offersPerRotation,
    randomSource,
  ).map(
    ({ countryId }): RareBlisterOffer => ({
      id: `${id}:${countryId}`,
      rotationId: id,
      countryId,
      price: RARE_SHOP_CONFIG.price,
      cardsCount: RARE_SHOP_CONFIG.cardsPerPack,
      missingCardChance: RARE_SHOP_CONFIG.missingCardChance,
      generatedAt: now,
      expiresAt,
      purchasedAt: null,
      extendedUntil: null,
    }),
  )
  return { id, generatedAt: now, expiresAt, offers }
}

export const getRareOfferStatus = (
  offer: RareBlisterOffer,
  now: number,
): RareBlisterOfferStatus => {
  if (offer.purchasedAt !== null) return 'purchased'
  return now >= (offer.extendedUntil ?? offer.expiresAt) ? 'expired' : 'available'
}

// Проверяет суточный лимит и возвращает новое неизменяемое состояние продления.
export const createExtendedRareShopState = (
  state: RareShopState,
  offerId: string,
  now: number,
  dateKey: string,
): { status: RareBlisterExtensionStatus; state: RareShopState } => {
  if (state.lastExtensionDate === dateKey) {
    return { status: 'already-used-today', state }
  }
  const offer: RareBlisterOffer | undefined = state.currentRotation?.offers.find(
    ({ id }: RareBlisterOffer): boolean => id === offerId,
  )
  if (
    !offer ||
    now >= offer.expiresAt ||
    offer.purchasedAt !== null ||
    offer.extendedUntil !== null
  ) {
    return { status: 'unavailable', state }
  }

  const extended: RareBlisterOffer = {
    ...offer,
    extendedUntil: offer.expiresAt + RARE_SHOP_CONFIG.extensionDurationMs,
  }
  const currentRotation: RareShopRotation | null = state.currentRotation
    ? {
        ...state.currentRotation,
        offers: state.currentRotation.offers.map(
          (item: RareBlisterOffer): RareBlisterOffer =>
            item.id === offerId ? extended : item,
        ),
      }
    : null
  return {
    status: 'extended',
    state: {
      ...state,
      currentRotation,
      extendedOffers: [
        ...state.extendedOffers.filter(
          (item: RareBlisterOffer): boolean => item.id !== extended.id,
        ),
        extended,
      ],
      extendedOffer: extended,
      extendedOfferId: offerId,
      lastExtensionDate: dateKey,
    },
  }
}

// Создаёт четыре награды страны через Drop Engine V2 и при успехе подмешивает одну недостающую.
export const createRareBlisterContents = (
  catalog: NormalizedCardCatalog,
  activeInstances: readonly StickerInstance[],
  randomSource: RandomSource,
  missingCardChance: number = RARE_SHOP_CONFIG.missingCardChance,
): RareBlisterContents => {
  const ownedIds: Set<string> = new Set(
    activeInstances.map(({ playerId }: StickerInstance): string => playerId),
  )
  const missingCards: CardDefinition[] = catalog.cards.filter(
    ({ id }: CardDefinition): boolean => !ownedIds.has(id),
  )
  const guaranteeRollSucceeded: boolean =
    missingCards.length > 0 &&
    shouldGuaranteeMissingCard(getRandomUnit(randomSource), missingCardChance)
  const selected: CardDefinition[] = []

  if (guaranteeRollSucceeded) {
    selected.push(
      selectWeighted(
        missingCards,
        (card: CardDefinition): number =>
          rarityWeight[card.rarity] * card.selectionWeight,
        randomSource,
      ),
    )
  }

  while (selected.length < RARE_SHOP_CONFIG.cardsPerPack) {
    selected.push(
      selectCardV2({
        catalogs: [catalog],
        packConfig: PACK_CONFIGS.standard,
        poolId: 'standard',
        defaultSelectionWeight: DROP_ENGINE_CONFIG.defaultSelectionWeight,
        randomSource,
      }) as CardDefinition,
    )
  }

  const seenIds: Set<string> = new Set(ownedIds)
  const rewards = shuffle(selected, randomSource).map((card: CardDefinition) => {
    const isDuplicate: boolean = seenIds.has(card.id)
    seenIds.add(card.id)
    return {
      instanceId: createId(),
      albumId: card.albumId,
      playerId: card.id,
      isDuplicate,
    }
  })
  return { rewards, guaranteeRollSucceeded }
}
