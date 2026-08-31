import { describe, expect, it } from 'vitest'
import { requireAlbum } from '@/data/albumRegistry'

describe('englandClubsLogo journal', () => {
  it('publishes 795 cards and a three-page logo contents', () => {
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
    expect(contentsPage?.contentsVariant).toBe('logo-grid')
    expect(contentsPage?.continuationPageIds).toEqual([
      'england-clubs-logo-contents-2',
      'england-clubs-logo-contents-3',
      'england-clubs-logo-contents-4',
    ])
    expect(items?.[0]?.pages).toBe('08–09')
    expect(items?.at(-1)?.pages).toBe('118–119')
    expect(items?.every(({ logo }) => logo?.startsWith('/leagueLogos/england/'))).toBe(true)
  })
})
