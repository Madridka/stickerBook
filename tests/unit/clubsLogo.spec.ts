import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import laLigaCards from '@/data/clubsLogo/spain/la-liga/cards.json'
import segundaCards from '@/data/clubsLogo/spain/segunda-division/cards.json'
import primeraFederacionCards from '@/data/clubsLogo/spain/primera-federacion/cards.json'
import segundaFederacionCards from '@/data/clubsLogo/spain/segunda-federacion/cards.json'
import terceraFederacionCards from '@/data/clubsLogo/spain/tercera-federacion/cards.json'
import album from '@/data/clubsLogo/album'
import cards, { catalogs } from '@/data/clubsLogo/catalog'
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

describe('clubsLogo journal', () => {
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
    expect(cards.every(({ albumId }) => albumId === 'clubsLogo')).toBe(true)
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
      expect(card.image).toMatch(/\/clubsLogo\/cards\/spain\/.+\.webp$/)
      expect(existsSync(resolve('public', card.image.replace(/^\/+/, '')))).toBe(true)
    }
  })

  it('creates one unique album slot for every source card', () => {
    const slots = album.pages.flatMap(({ slots }) => slots)
    expect(album.pages).toHaveLength(59)
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

    for (let pageIndex = 3; pageIndex < album.pages.length; pageIndex += 2) {
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

  it('starts with a cover, an information spread and La Liga on pages 04–05', () => {
    expect(album.pages.slice(0, 3).map(({ id }) => id)).toEqual([
      'clubs-logo-cover',
      'clubs-logo-history',
      'clubs-logo-contents',
    ])
    expect(album.pages.slice(0, 3).every(({ slots }) => slots.length === 0)).toBe(true)
    expect(album.pages.slice(3, 5).flatMap(({ slots }) => slots)).toHaveLength(20)
    expect(
      album.pages
        .slice(3, 5)
        .flatMap(({ slots }) => slots)
        .every(({ playerId }) => playerId.startsWith('esp1-')),
    ).toBe(true)
  })

  it('references a generated WebP visual for every journal page', () => {
    for (const page of album.pages) {
      expect(existsSync(resolve('assets/game/clubsLogo/main/album', page.image))).toBe(true)
    }
  })

  it('registers the journal as a hidden development edition', () => {
    const definition = requireAlbum('clubsLogo')
    expect(definition.route).toBe('/clubsLogo')
    expect(definition.metadata.hiddenFromLibrary).toBe(true)
    expect(definition.metadata.playerAccessible).toBe(false)
    expect(getLibraryAlbums().some(({ id }) => id === 'clubsLogo')).toBe(false)
    expect(getPlayerAlbums().some(({ id }) => id === 'clubsLogo')).toBe(false)
    expect(getPlayerAlbumById('clubsLogo')).toBeUndefined()
    expect(getPlayerAlbumCard('clubsLogo', cards[0].id)).toBeUndefined()
    expect(getBlisters().some(({ albumId }) => albumId === 'clubsLogo')).toBe(false)
    expect(
      cards.every(({ acquisition }) =>
        acquisition.every(
          (source): boolean =>
            source.type !== 'pack' || source.poolId === 'clubs-logo-development',
        ),
      ),
    ).toBe(true)
    expect(definition.editorialPages.map(({ pageId }) => pageId)).toEqual([
      'clubs-logo-cover',
      'clubs-logo-history',
      'clubs-logo-contents',
    ])

    const contents = definition.editorialPages.find(
      ({ pageId }) => pageId === 'clubs-logo-contents',
    )
    expect(contents?.kind).toBe('contents')
    expect(contents?.contentsSections?.flatMap(({ items }) => items)).toHaveLength(27)
    expect(contents?.contentsSections?.[0]?.items[0]?.pages).toBe('04–05')
    expect(contents?.contentsSections?.[0]?.items[0]?.targetPage).toBe(4)
    expect(contents?.contentsSections?.[2]?.items[8]?.pages).toBe('58–59')
    expect(contents?.contentsSections?.[2]?.items[8]?.targetPage).toBe(58)
  })
})
