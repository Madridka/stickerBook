import { describe, expect, it } from 'vitest'
import { requireAlbum } from '@/data/albumRegistry'
import structure from '@/data/englandClubsLogo/england/structure.json'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

describe('englandClubsLogo journal', () => {
  it('publishes all 1088 cards and four pages of logo contents', () => {
    const album = requireAlbum('englandClubsLogo')
    const contentsPage = album.editorialPages.find(
      ({ pageId }) => pageId === 'england-clubs-logo-contents',
    )
    const items = contentsPage?.contentsSections?.flatMap(({ items: sectionItems }) => sectionItems)

    expect(album.cards).toHaveLength(1088)
    expect(album.metadata.clubs).toBe(1088)
    expect(album.metadata).not.toHaveProperty('pyramidClubs')
    expect(contentsPage?.contentsSections).toHaveLength(6)
    expect(items).toHaveLength(52)
    expect(contentsPage?.contentsVariant).toBe('logo-grid')
    expect(contentsPage?.continuationPageIds).toEqual([
      'england-clubs-logo-contents-2',
      'england-clubs-logo-contents-3',
      'england-clubs-logo-contents-4',
    ])
    expect(items?.[0]?.pages).toBe('08–09')
    expect(items?.at(-1)?.pages).toBe('162–163')
    expect(items?.every(({ logo }) => logo?.startsWith('/leagueLogos/england/'))).toBe(true)
  })

  it('keeps every division complete with its original club IDs and numbers', () => {
    const album = requireAlbum('englandClubsLogo')
    const slots = album.pages.flatMap(({ slots: pageSlots }) => pageSlots)
    expect(new Set(album.cards.map(({ id }) => id)).size).toBe(1088)
    expect(slots).toHaveLength(1088)
    expect(new Set(slots.map(({ playerId }) => playerId)).size).toBe(1088)

    for (const division of structure.divisions) {
      const clubIds = division.clubs.map(({ id }) => id)
      const prefix = clubIds[0].replace(/-\d+$/, '')
      const cards = album.cards.filter(({ id }) => id.startsWith(`${prefix}-`))
      expect(cards.map(({ id }) => id), division.section).toEqual(clubIds)
      expect(cards.map(({ cardNumber }) => cardNumber), division.section).toEqual(
        division.clubs.map((_, index) => String(index + 1).padStart(2, '0')),
      )
      expect(cards.map(({ albumSlot }) => albumSlot), division.section).toEqual(
        division.clubs.map((_, index) => index + 1),
      )
      for (const club of division.clubs) {
        expect(slots.filter(({ playerId }) => playerId === club.id), club.id).toHaveLength(1)
      }
      for (const card of cards) {
        expect(existsSync(resolve('public', card.image.replace(/^\//, ''))), card.image).toBe(true)
      }
    }
  })
})
