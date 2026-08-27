import { describe, expect, it } from 'vitest'
import manifest from '@/data/ucl-26-27/manifest.json'
import cards, { catalogs } from '@/data/ucl-26-27/catalog'
import album from '@/data/ucl-26-27/album'
import { loadCardCatalogs } from '@/data/cardCatalogLoader'
import type { CardRarity, PlayerPosition } from '@/types/cardCatalog'

const rawCatalogModules = import.meta.glob<unknown>('../../src/data/ucl-26-27/*/cards.json', {
  eager: true,
  import: 'default',
})
const rawCatalogs: readonly unknown[] = Object.values(rawCatalogModules)

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

describe('UCL 2026/27 catalog', () => {
  it('loads and normalizes every club catalog without mutating JSON inputs', () => {
    const snapshot = JSON.stringify(rawCatalogs)
    const normalized = loadCardCatalogs(
      rawCatalogs,
      '/game/',
      manifest.expectedClubCount,
      manifest.cardsPerClub,
    )

    expect(JSON.stringify(rawCatalogs)).toBe(snapshot)
    expect(normalized).toHaveLength(manifest.expectedClubCount)
    expect(normalized.flatMap(({ cards }) => cards)).toHaveLength(manifest.baseCardCount)
    expect(
      normalized.flatMap(({ cards }) => cards).every(({ image }) => image.startsWith('/game/ucl-26-27/cards/')),
    ).toBe(true)
  })

  it('exports complete catalogs with unique collection-scoped identities', () => {
    expect(catalogs).toHaveLength(manifest.expectedClubCount)
    expect(cards).toHaveLength(manifest.baseCardCount)
    expect(new Set(cards.map(({ id }) => id)).size).toBe(cards.length)
    expect(cards.every(({ collectionId }) => collectionId === manifest.id)).toBe(true)
    expect(new Set(catalogs.map(({ teamId }) => teamId))).toEqual(
      new Set(manifest.clubs.map(({ teamId }) => teamId)),
    )
  })

  it('keeps slot, position, kind and rarity contracts for every club', () => {
    for (const catalog of catalogs) {
      const baseCards = catalog.cards.filter(({ series }) => series === 'base')
      const players = baseCards.filter((card) => card.kind === 'player')

      expect(baseCards.map(({ albumSlot }) => albumSlot).sort((left, right) => (left ?? 0) - (right ?? 0))).toEqual(
        Array.from({ length: manifest.cardsPerClub }, (_value, index) => index + 1),
      )
      expect(baseCards.map(({ cardNumber }) => cardNumber).sort()).toEqual(
        Array.from({ length: manifest.cardsPerClub }, (_value, index) => String(index + 1).padStart(2, '0')),
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

  it('builds a complete two-page spread for every club', () => {
    const teamPages = album.pages.slice(5)
    const slots = teamPages.flatMap((page) => page.slots)

    expect(album.pages).toHaveLength(5 + manifest.expectedClubCount * 2)
    expect(teamPages).toHaveLength(manifest.expectedClubCount * 2)
    expect(teamPages.every((page) => page.slots.length === 10)).toBe(true)
    expect(slots).toHaveLength(manifest.baseCardCount)
    expect(new Set(slots.map(({ id }) => id)).size).toBe(slots.length)
    expect(new Set(slots.map(({ playerId }) => playerId))).toEqual(
      new Set(cards.map(({ id }) => id)),
    )
  })
})
