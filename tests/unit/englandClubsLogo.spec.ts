import { describe, expect, it } from 'vitest'
import { requireAlbum } from '@/data/albumRegistry'

describe('englandClubsLogo journal', () => {
  it('publishes 795 cards and a league-by-league contents page', () => {
    const album = requireAlbum('englandClubsLogo')
    const contentsPage = album.editorialPages.find(
      ({ pageId }) => pageId === 'england-clubs-logo-contents',
    )
    const items = contentsPage?.contentsSections?.flatMap(({ items: sectionItems }) => sectionItems)

    expect(album.cards).toHaveLength(795)
    expect(album.metadata.clubs).toBe(795)
    expect(album.metadata).not.toHaveProperty('pyramidClubs')
    expect(contentsPage?.contentsSections).toHaveLength(6)
    expect(items).toHaveLength(52)
    expect(items?.[0]?.pages).toBe('04–05')
    expect(items?.at(-1)?.pages).toBe('114–115')
    expect(items?.every(({ logo }) => logo?.startsWith('/leagueLogos/england/'))).toBe(true)
  })
})
