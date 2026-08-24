import { describe, expect, it } from 'vitest'
import { createClubLogoRarityOdds } from '@/config/gameBalance'
import englandCards from '@/data/englandClubsLogo/catalog'
import russiaCards from '@/data/russiaClubsLogo/catalog'
import spainCards from '@/data/spainClubsLogo/catalog'
import type { CardDefinition, CardRarity } from '@/types/cardCatalog'

const collections: readonly CardDefinition[][] = [spainCards, russiaCards, englandCards]

const divisionLevel = (leagueId: string | undefined): number | undefined => {
  const match: RegExpMatchArray | null = leagueId?.match(/(\d+)$/) ?? null
  return match ? Number(match[1]) : undefined
}

describe('club logo rarity balance', () => {
  it('uses common for division three and below and uncommon for division two', () => {
    for (const cards of collections) {
      for (const card of cards) {
        if (card.kind !== 'team') continue

        const level: number | undefined = divisionLevel(card.leagueId)
        if (level !== undefined && level >= 3) expect(card.rarity).toBe('common')
        if (level === 2) expect(card.rarity).toBe('uncommon')
      }
    }
  })

  it('splits every first division between regular and elite clubs', () => {
    for (const cards of collections) {
      const firstDivision = cards.filter(
        (card): boolean => card.kind === 'team' && divisionLevel(card.leagueId) === 1,
      )

      expect(firstDivision.some(({ rarity }) => rarity === 'uncommon')).toBe(true)
      expect(firstDivision.some(({ rarity }) => rarity === 'rare')).toBe(true)
      expect(
        firstDivision.every(({ rarity }) => rarity === 'uncommon' || rarity === 'rare'),
      ).toBe(true)
    }
  })

  it('makes each lower-division logo more likely than a regular or elite logo', () => {
    for (const cards of collections) {
      const rarityOdds = createClubLogoRarityOdds(cards)
      const counts = cards.reduce<Record<CardRarity, number>>(
        (result, { rarity }) => ({ ...result, [rarity]: result[rarity] + 1 }),
        { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
      )
      const perCardChance = (rarity: CardRarity): number =>
        rarityOdds[rarity] / counts[rarity]

      expect(perCardChance('common')).toBeGreaterThan(perCardChance('uncommon'))
      expect(perCardChance('uncommon')).toBeGreaterThan(perCardChance('rare'))
    }
  })
})
