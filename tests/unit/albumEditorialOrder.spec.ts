import { describe, expect, it } from 'vitest'
import { requireAlbum } from '@/data/albumRegistry'

const journalIds = [
  'wc-26',
  'ucl-26-27',
  'rpl-26-27',
  'tomsk',
  'spainClubsLogo',
  'russiaClubsLogo',
  'englandClubsLogo',
] as const

describe('collectible journal editorial order', () => {
  it.each(journalIds)('%s opens with cover, two information pages and contents from page 4', (albumId) => {
    const album = requireAlbum(albumId)
    const editorialByPageId = new Map(album.editorialPages.map((page) => [page.pageId, page]))
    const firstPages = album.pages.slice(0, 3)

    expect(firstPages.map(({ number }) => number)).toEqual([1, 2, 3])
    expect(editorialByPageId.get(firstPages[0].id)?.kind).toBe('cover')
    expect(editorialByPageId.get(firstPages[1].id)?.kind).toBe('article')
    expect(editorialByPageId.get(firstPages[2].id)?.kind).toBe('article')

    const contentsFirstPage = album.contents.length > 0
      ? album.layout.contentsFirstPage
      : album.editorialPages.find(({ kind }) => kind === 'contents')?.contentsFirstPage
    expect(contentsFirstPage).toBe(4)
  })
})
