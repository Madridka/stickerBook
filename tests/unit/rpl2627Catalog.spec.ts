import { describe, expect, it } from 'vitest'
import manifest from '@/data/russia/manifest.json'
import cards, { catalogs } from '@/data/russia/catalog'
import album from '@/data/russia/album'
import { BLISTER_CONFIGS, PACK_HUNT_REWARD_CONFIG } from '@/config/gameBalance'
import type { CardRarity, PlayerPosition } from '@/types/cardCatalog'

const expectedPositions: Readonly<Record<PlayerPosition, number>> = {
  GK: 2,
  DF: 6,
  MF: 5,
  FW: 5,
}
const expectedRarities: Readonly<Record<CardRarity, number>> = {
  common: 7,
  uncommon: 6,
  rare: 4,
  epic: 2,
  legendary: 1,
}

describe('RPL 2026/27 catalog', () => {
  it('exports every prepared club and card with unique paths', () => {
    expect(catalogs).toHaveLength(manifest.expectedClubCount)
    expect(cards).toHaveLength(manifest.baseCardCount)
    expect(new Set(cards.map(({ id }) => id)).size).toBe(cards.length)
    expect(new Set(cards.map(({ image }) => image)).size).toBe(cards.length)
    expect(cards.every(({ collectionId }) => collectionId === manifest.id)).toBe(true)
    expect(new Set(catalogs.map(({ teamId }) => teamId))).toEqual(
      new Set(manifest.clubs.map(({ teamId }) => teamId)),
    )
  })

  it('keeps the 20-card position and rarity contract for every club', () => {
    for (const catalog of catalogs) {
      const baseCards = catalog.cards.filter(({ series }) => series === 'base')
      const players = baseCards.filter((card) => card.kind === 'player')

      expect(baseCards.map(({ albumSlot }) => albumSlot).sort((left, right) => (left ?? 0) - (right ?? 0))).toEqual(
        Array.from({ length: manifest.cardsPerClub }, (_value, index) => index + 1),
      )
      expect(baseCards.filter(({ kind }) => kind === 'team')).toHaveLength(1)
      expect(baseCards.filter(({ kind }) => kind === 'coach')).toHaveLength(1)
      for (const [position, expected] of Object.entries(expectedPositions)) {
        expect(players.filter((card) => card.position === position)).toHaveLength(expected)
      }
      for (const [rarity, expected] of Object.entries(expectedRarities)) {
        expect(baseCards.filter((card) => card.rarity === rarity)).toHaveLength(expected)
      }
    }
  })

  it('builds one two-page spread per club', () => {
    const teamPages = album.pages.slice(5)
    const slots = teamPages.flatMap((page) => page.slots)

    expect(album.pages).toHaveLength(5 + manifest.expectedClubCount * 2)
    expect(teamPages).toHaveLength(manifest.expectedClubCount * 2)
    expect(teamPages.every((page) => page.slots.length === 10)).toBe(true)
    expect(new Set(slots.map(({ playerId }) => playerId))).toEqual(
      new Set(cards.map(({ id }) => id)),
    )
    expect(album.pages.slice(0, 5).map(({ id, image }) => ({ id, image }))).toEqual([
      { id: 'rpl-26-27-cover', image: 'info/cover.webp' },
      { id: 'rpl-26-27-info', image: 'info/about.webp' },
      { id: 'rpl-26-27-details', image: 'info/about.webp' },
      { id: 'rpl-26-27-contents-1', image: 'info/contents.webp' },
      { id: 'rpl-26-27-contents-2', image: 'info/contents.webp' },
    ])
  })

  it('participates in shop, daily-task and mini-game rewards', () => {
    expect(BLISTER_CONFIGS.rpl.albumIds).toEqual(['rpl-26-27'])
    expect(BLISTER_CONFIGS.rpl.poolId).toBe('rpl-26-27-standard')
    expect(BLISTER_CONFIGS.mixed.albumIds).toContain('rpl-26-27')
    expect(PACK_HUNT_REWARD_CONFIG.blisterIds).toContain(BLISTER_CONFIGS.rpl.id)
  })
})
