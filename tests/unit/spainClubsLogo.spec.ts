import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import laLigaCards from '@/data/spainClubsLogo/spain/la-liga/cards.json'
import segundaCards from '@/data/spainClubsLogo/spain/segunda-division/cards.json'
import primeraFederacionCards from '@/data/spainClubsLogo/spain/primera-federacion/cards.json'
import segundaFederacionCards from '@/data/spainClubsLogo/spain/segunda-federacion/cards.json'
import terceraFederacionCards from '@/data/spainClubsLogo/spain/tercera-federacion/cards.json'
import album from '@/data/spainClubsLogo/album'
import cards, { catalogs } from '@/data/spainClubsLogo/catalog'
import {
  getBlisters,
  getLibraryAlbums,
  getPlayerAlbumById,
  getPlayerAlbumCard,
  getPlayerAlbums,
  requireAlbum,
} from '@/data/albumRegistry'

const rawCards = [
  ...laLigaCards,
  ...segundaCards,
  ...primeraFederacionCards,
  ...segundaFederacionCards,
  ...terceraFederacionCards,
]

describe('spainClubsLogo journal', () => {
  it('builds all Spanish division catalogs including drafts', () => {
    expect(cards).toHaveLength(rawCards.length)
    expect(cards).toHaveLength(496)
    expect(catalogs).toHaveLength(5)
    expect(catalogs.map(({ teamId }) => teamId)).toEqual([
      'esp1',
      'esp2',
      'esp3',
      'esp4',
      'esp5',
    ])
    expect(new Set(cards.map(({ id }) => id)).size).toBe(cards.length)
    expect(cards.every(({ albumId }) => albumId === 'spainClubsLogo')).toBe(true)
  })

  it('keeps club metadata and generated asset paths on every card', () => {
    for (const card of cards) {
      expect(card.kind).toBe('team')
      if (card.kind !== 'team') continue
      expect(card.city).toBeTruthy()
      expect(card.country).toBeTruthy()
      expect(card.foundedYear).toBeGreaterThan(1800)
      expect(card.stadium).toBeTruthy()
      expect(card.leagueId).toMatch(/^esp[1-5]$/)
      expect(card.countryCode).toBe('ESP')
      expect(card.image).toMatch(/\/spainClubsLogo\/cards\/spain\/.+\.webp$/)
      expect(existsSync(resolve('public', card.image.replace(/^\/+/, '')))).toBe(true)
    }
  })

  it('creates one unique album slot for every source card', () => {
    const slots = album.pages.flatMap(({ slots }) => slots)
    expect(album.pages).toHaveLength(63)
    expect(slots).toHaveLength(rawCards.length)
    expect(new Set(slots.map(({ id }) => id)).size).toBe(slots.length)
    expect(new Set(slots.map(({ playerId }) => playerId))).toEqual(
      new Set(rawCards.map(({ id }) => id)),
    )
  })

  it('keeps every desktop spread inside one league or federation group', () => {
    const sectionId = (image: string): string =>
      image
        .replace(/-divider-(left|right)\.webp$/, '')
        .replace(/-(left|right)\.webp$/, '')

    for (let pageIndex = 7; pageIndex < album.pages.length; pageIndex += 2) {
      const spread = album.pages.slice(pageIndex, pageIndex + 2)
      expect(spread).toHaveLength(2)
      expect(new Set(spread.map(({ image }) => sectionId(image))).size).toBe(1)
    }
  })

  it('keeps club slots clear of page navigation controls', () => {
    const clubSlots = album.pages.flatMap(({ slots }) => slots)
    for (const slot of clubSlots) {
      expect(slot.x).toBeGreaterThanOrEqual(68)
      expect(slot.x + slot.width).toBeLessThanOrEqual(1468)
      expect([258, 690]).toContain(slot.y)
    }
  })

  it('starts with a cover, two information pages and four contents pages', () => {
    expect(album.pages.slice(0, 7).map(({ id }) => id)).toEqual([
      'spain-clubs-logo-cover',
      'spain-clubs-logo-history',
      'spain-clubs-logo-guide',
      'spain-clubs-logo-contents',
      'spain-clubs-logo-contents-2',
      'spain-clubs-logo-contents-3',
      'spain-clubs-logo-contents-4',
    ])
    expect(album.pages.slice(0, 7).every(({ slots }) => slots.length === 0)).toBe(true)
    expect(album.pages.slice(7, 9).flatMap(({ slots }) => slots)).toHaveLength(20)
    expect(
      album.pages
        .slice(7, 9)
        .flatMap(({ slots }) => slots)
        .every(({ playerId }) => playerId.startsWith('esp1-')),
    ).toBe(true)
  })

  it('references a generated WebP visual for every journal page', () => {
    for (const page of album.pages) {
      expect(existsSync(resolve('assets/game/spainClubsLogo/main/album', page.image))).toBe(true)
    }
  })

  it('registers the Spanish club logos as a player journal', () => {
    const definition = requireAlbum('spainClubsLogo')
    expect(definition.route).toBe('/album/spainClubsLogo')
    expect(definition.metadata.hiddenFromLibrary).not.toBe(true)
    expect(definition.metadata.playerAccessible).not.toBe(false)
    expect(getLibraryAlbums().some(({ id }) => id === 'spainClubsLogo')).toBe(true)
    expect(getPlayerAlbums().some(({ id }) => id === 'spainClubsLogo')).toBe(true)
    expect(getPlayerAlbumById('spainClubsLogo')).toBe(definition)
    expect(getPlayerAlbumCard('spainClubsLogo', cards[0].id)).toBe(cards[0])
    expect(getBlisters().some(({ albumId }) => albumId === 'spainClubsLogo')).toBe(true)
    expect(
      cards.every(({ acquisition }) =>
        acquisition.every(
          (source): boolean =>
            source.type !== 'pack' || source.poolId === 'spain-clubs-logo-development',
        ),
      ),
    ).toBe(true)
    expect(definition.editorialPages.map(({ pageId }) => pageId)).toEqual([
      'spain-clubs-logo-cover',
      'spain-clubs-logo-history',
      'spain-clubs-logo-guide',
      'spain-clubs-logo-contents',
    ])

    const contents = definition.editorialPages.find(
      ({ pageId }) => pageId === 'spain-clubs-logo-contents',
    )
    expect(contents?.kind).toBe('contents')
    expect(contents?.contentsSections?.flatMap(({ items }) => items)).toHaveLength(27)
    expect(contents?.contentsVariant).toBe('logo-grid')
    expect(contents?.continuationPageIds).toEqual([
      'spain-clubs-logo-contents-2',
      'spain-clubs-logo-contents-3',
      'spain-clubs-logo-contents-4',
    ])
    expect(contents?.contentsSections?.[0]?.items[0]?.pages).toBe('08–09')
    expect(contents?.contentsSections?.[0]?.items[0]?.targetPage).toBe(8)
    expect(contents?.contentsSections?.[2]?.items[8]?.pages).toBe('62–63')
    expect(contents?.contentsSections?.[2]?.items[8]?.targetPage).toBe(62)
  })
})
