import { describe, expect, it, vi } from 'vitest'
import { catalogs } from '@/data/wc-26/catalog'
import type { NormalizedCardCatalog, StickerInstance } from '@/types'
import type { RareShopState } from '@/features/rareShop/types'
import {
  createCountryOfferCandidates,
  createExtendedRareShopState,
  createRareBlisterContents,
  createRareShopRotation,
  getRareOfferStatus,
  selectOfferCountries,
  shouldGuaranteeMissingCard,
} from '@/features/rareShop/rareShopDomain'

vi.mock('@/utils/createId', () => ({ createId: () => 'stable-id' }))

const germany: NormalizedCardCatalog = catalogs.find(
  ({ teamId }: NormalizedCardCatalog): boolean => teamId === 'germany',
) as NormalizedCardCatalog
const instanceFor = (playerId: string): StickerInstance => ({
  id: `instance-${playerId}`,
  playerId,
  quality: 100,
  location: 'inventory',
})
const repeatingRandom = (...values: number[]): (() => number) => {
  let index: number = 0
  return (): number => {
    const value: number = values[index % values.length] ?? 0
    index += 1
    return value
  }
}

describe('rare shop domain', () => {
  it('выполняет один roll на весь блистер', () => {
    expect(shouldGuaranteeMissingCard(0.79, 0.8)).toBe(true)
    expect(shouldGuaranteeMissingCard(0.8, 0.8)).toBe(false)
    expect(shouldGuaranteeMissingCard(Number.NaN, 0.8)).toBe(false)
  })

  it('гарантирует единственную недостающую карточку и оставляет ровно четыре награды', () => {
    const missing = germany.cards[germany.cards.length - 1]
    if (!missing) throw new Error('Germany catalog is empty')
    const owned: StickerInstance[] = germany.cards
      .filter(({ id }): boolean => id !== missing.id)
      .map(({ id }): StickerInstance => instanceFor(id))

    const result = createRareBlisterContents(
      germany,
      owned,
      repeatingRandom(0.1, 0.2, 0.3, 0.4),
    )

    expect(result.guaranteeRollSucceeded).toBe(true)
    expect(result.rewards).toHaveLength(4)
    expect(result.rewards.some(({ playerId }): boolean => playerId === missing.id)).toBe(true)
    expect(
      result.rewards.every(({ playerId }): boolean =>
        germany.cards.some(({ id }): boolean => id === playerId),
      ),
    ).toBe(true)
  })

  it('при неуспешном roll использует четыре стандартных выбора страны', () => {
    const result = createRareBlisterContents(
      germany,
      [],
      repeatingRandom(0.95, 0.1, 0.2, 0.3, 0.4, 0.5),
    )

    expect(result.guaranteeRollSucceeded).toBe(false)
    expect(result.rewards).toHaveLength(4)
    expect(
      result.rewards.every(({ playerId }): boolean =>
        germany.cards.some(({ id }): boolean => id === playerId),
      ),
    ).toBe(true)
  })

  it('не падает для полностью собранной страны и не добавляет пятую карточку', () => {
    const result = createRareBlisterContents(
      germany,
      germany.cards.map(({ id }): StickerInstance => instanceFor(id)),
      repeatingRandom(0.1, 0.2, 0.3),
    )

    expect(result.guaranteeRollSucceeded).toBe(false)
    expect(result.rewards).toHaveLength(4)
  })

  it('повышает вес незавершённых и почти собранных стран', () => {
    const first = catalogs[0]
    const second = catalogs[1]
    if (!first || !second) throw new Error('Not enough catalogs')
    const ownedIds: Set<string> = new Set([
      ...first.cards.map(({ id }): string => id),
      ...second.cards.slice(1).map(({ id }): string => id),
    ])
    const candidates = createCountryOfferCandidates([first, second], ownedIds)
    const completed = candidates.find(({ countryId }): boolean => countryId === first.teamId)
    const nearlyCompleted = candidates.find(
      ({ countryId }): boolean => countryId === second.teamId,
    )

    expect(completed?.missingCards).toBe(0)
    expect(nearlyCompleted?.missingCards).toBe(1)
    expect(nearlyCompleted?.weight).toBeGreaterThan(completed?.weight ?? 0)
  })

  it('создаёт стабильную четырёхчасовую ротацию из трёх разных стран', () => {
    const candidates = createCountryOfferCandidates(catalogs.slice(0, 6), new Set())
    const selected = selectOfferCountries(candidates, 3, repeatingRandom(0.1, 0.5, 0.9))
    const rotation = createRareShopRotation(candidates, 1_000, repeatingRandom(0.2, 0.4, 0.6))

    expect(new Set(selected.map(({ countryId }): string => countryId)).size).toBe(3)
    expect(rotation.offers).toHaveLength(3)
    expect(new Set(rotation.offers.map(({ countryId }): string => countryId)).size).toBe(3)
    expect(rotation.expiresAt - rotation.generatedAt).toBe(4 * 60 * 60 * 1_000)
    expect(rotation.offers.every(({ id }): boolean => !id.endsWith(':undefined'))).toBe(true)
  })

  it('различает доступное, купленное и завершённое предложение', () => {
    const rotation = createRareShopRotation(
      createCountryOfferCandidates(catalogs.slice(0, 3), new Set()),
      1_000,
      repeatingRandom(0.2),
    )
    const offer = rotation.offers[0]
    if (!offer) throw new Error('Rotation is empty')

    expect(getRareOfferStatus(offer, 2_000)).toBe('available')
    expect(getRareOfferStatus({ ...offer, purchasedAt: 2_000 }, 3_000)).toBe('purchased')
    expect(getRareOfferStatus(offer, rotation.expiresAt)).toBe('expired')
    expect(
      getRareOfferStatus({ ...offer, extendedUntil: rotation.expiresAt + 1_000 }, rotation.expiresAt),
    ).toBe('available')
  })

  it('продлевает одно предложение ровно на четыре часа и сохраняет суточный лимит', () => {
    const rotation = createRareShopRotation(
      createCountryOfferCandidates(catalogs.slice(0, 3), new Set()),
      1_000,
      repeatingRandom(0.2),
    )
    const offer = rotation.offers[0]
    if (!offer) throw new Error('Rotation is empty')
    const state: RareShopState = {
      id: 'current',
      currentRotation: rotation,
      extendedOffers: [],
      extendedOffer: null,
      lastExtensionDate: null,
      extendedOfferId: null,
      hasSeenRareShopInfo: false,
    }

    const result = createExtendedRareShopState(state, offer.id, 2_000, '2026-07-27')
    expect(result.status).toBe('extended')
    expect(result.state.extendedOffer?.extendedUntil).toBe(
      rotation.expiresAt + 4 * 60 * 60 * 1_000,
    )
    expect(
      createExtendedRareShopState(result.state, rotation.offers[1]?.id ?? '', 3_000, '2026-07-27')
        .status,
    ).toBe('already-used-today')
    const nextDay = createExtendedRareShopState(
      result.state,
      rotation.offers[1]?.id ?? '',
      3_000,
      '2026-07-28',
    )
    expect(nextDay.status).toBe('extended')
    expect(nextDay.state.extendedOffers).toHaveLength(2)
  })
})
