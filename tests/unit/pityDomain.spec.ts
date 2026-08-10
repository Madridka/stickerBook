import { describe, expect, it, vi } from 'vitest'
import { PITY_CONFIG } from '@/config/gameBalance'
import type { CardDefinition, CardRarity, NormalizedCardCatalog } from '@/types'
import {
  createPityPackRewards,
  isPityCompletionEligible,
  isPityPackTypeEligible,
  shouldProtectPack,
} from '@/features/pity/pityDomain'
import type { RandomSource, RarityOdds } from '@/utils/dropEngine'

const rarityOdds: RarityOdds = {
  common: 80,
  uncommon: 10,
  rare: 7,
  epic: 2.15,
  legendary: 0.85,
}

const createCard = (
  id: string,
  rarity: CardRarity = 'common',
  selectionWeight: number = 1,
): CardDefinition => ({
  id,
  albumId: 'test-album',
  collectionId: 'test-album',
  teamId: 'test-team',
  cardNumber: id,
  albumSlot: 1,
  kind: 'team',
  displayName: id,
  image: `/${id}.webp`,
  series: 'base',
  finish: 'standard',
  rarity,
  selectionWeight,
  acquisition: [{ type: 'pack', poolId: 'standard' }],
})

const createCatalog = (cards: CardDefinition[]): NormalizedCardCatalog => ({
  schemaVersion: 2,
  collectionId: 'test-album',
  teamId: 'test-team',
  defaults: {
    rarity: 'common',
    series: 'base',
    finish: 'standard',
    acquisition: [{ type: 'pack', poolId: 'standard' }],
  },
  cards,
})

const createSequenceRandom = (values: number[]): RandomSource => {
  let index = 0
  return (): number => values[index++] ?? 0
}

const createRewards = (
  cards: CardDefinition[],
  ownedPlayerIds: ReadonlySet<string>,
  protectionArmed: boolean,
  randomSource: RandomSource,
) =>
  createPityPackRewards({
    albumId: 'test-album',
    catalogs: [createCatalog(cards)],
    cardCount: 5,
    poolId: 'standard',
    rarityOdds,
    defaultSelectionWeight: 1,
    ownedPlayerIds,
    protectionArmed,
    randomSource,
    createInstanceId: vi.fn((): string => crypto.randomUUID()),
  })

describe('pity domain', () => {
  it('remains disabled below the exact 95% ratio and at 100%', () => {
    expect(isPityCompletionEligible(9499, 10000)).toBe(false)
    expect(isPityCompletionEligible(9500, 10000)).toBe(true)
    expect(isPityCompletionEligible(10000, 10000)).toBe(false)
  })

  it('arms only after four completed dry packs', () => {
    expect([0, 1, 2, 3].map(shouldProtectPack)).toEqual([false, false, false, false])
    expect(shouldProtectPack(PITY_CONFIG.dryPacksBeforeGuarantee)).toBe(true)
  })

  it('excludes rare and mixed packs from accumulation and protection', () => {
    expect(isPityPackTypeEligible('standard', ['wc-26'], true)).toBe(true)
    expect(isPityPackTypeEligible('rare', ['wc-26'], true)).toBe(false)
    expect(isPityPackTypeEligible('mixed', ['wc-26', 'ucl-26-27'], false)).toBe(false)
    expect(isPityPackTypeEligible('special', ['wc-26'], false)).toBe(false)
  })

  it('forces a missing card only into the last slot of a protected dry pack', () => {
    const duplicate = createCard('owned')
    const missing = createCard('missing')
    const result = createRewards(
      [duplicate, missing],
      new Set([duplicate.id]),
      true,
      createSequenceRandom([
        0, 0,
        0, 0,
        0, 0,
        0, 0,
        0, 0,
      ]),
    )

    expect(result.rewards.slice(0, 4).every(({ isDuplicate }) => isDuplicate)).toBe(true)
    expect(result.rewards[4]?.playerId).toBe(missing.id)
    expect(result.pityApplied).toBe(true)
    expect(result.hasNewCard).toBe(true)
  })

  it('does not force a card after a natural new drop in a protected pack', () => {
    const duplicate = createCard('owned')
    const missing = createCard('missing')
    const result = createRewards(
      [duplicate, missing],
      new Set([duplicate.id]),
      true,
      createSequenceRandom([
        0, 0.99,
        0, 0,
        0, 0,
        0, 0,
        0, 0,
      ]),
    )

    expect(result.rewards[0]?.playerId).toBe(missing.id)
    expect(result.hasNewCard).toBe(true)
    expect(result.pityApplied).toBe(false)
  })

  it('keeps rarity odds and selection weights in the missing-only Drop Engine pool', () => {
    const ownedCommon = createCard('owned-common')
    const lightRare = createCard('light-rare', 'rare', 1)
    const heavyRare = createCard('heavy-rare', 'rare', 9)
    const result = createRewards(
      [ownedCommon, lightRare, heavyRare],
      new Set([ownedCommon.id]),
      true,
      createSequenceRandom([
        0, 0,
        0, 0,
        0, 0,
        0, 0,
        0, 0.5,
      ]),
    )

    expect(result.rewards[4]?.playerId).toBe(heavyRare.id)
    expect(result.pityApplied).toBe(true)
  })

  it('falls back to normal RNG when the blister pool has no eligible missing card', () => {
    const duplicate = createCard('owned')
    const unavailableMissing = {
      ...createCard('event-only'),
      acquisition: [{ type: 'event' as const, eventId: 'special' }],
    }
    const result = createRewards(
      [duplicate, unavailableMissing],
      new Set([duplicate.id]),
      true,
      createSequenceRandom(Array.from({ length: 12 }, (): number => 0)),
    )

    expect(result.hasNewCard).toBe(false)
    expect(result.pityApplied).toBe(false)
    expect(result.rewards.every(({ playerId }) => playerId === duplicate.id)).toBe(true)
  })
})
