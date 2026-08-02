import { describe, expect, it } from 'vitest'
import { getLibraryAlbums, requireAlbum } from '@/data/albumRegistry'

describe('Tomsk football history journal', () => {
  const album = requireAlbum('tomsk')

  it('registers the renamed journal with two contents pages and five eras', () => {
    expect(album.route).toBe('/album/tomsk')
    expect(album.pages).toHaveLength(15)
    expect(album.layout).toMatchObject({
      contentsFirstPage: 4,
      contentsLastPage: 5,
      contentsPageSize: 4,
    })
    expect(album.contents.map(({ pageId }) => pageId)).toEqual([
      'tom-2000-left',
      'tom-2005-left',
      'tom-2008-left',
      'tom-2013-left',
      'kdv-left',
    ])
    expect(getLibraryAlbums().some(({ id }) => id === 'tomsk')).toBe(true)
  })

  it('uses Tomsk-owned WebP assets and a dedicated two-page background for every era', () => {
    expect(album.theme.coverImage).toBe('info/cover.webp')
    expect(album.metadata.assetAlbumId).toBeUndefined()
    expect(album.metadata.cardAssetAlbumId).toBe('kdv')

    const eraImages = album.pages
      .filter(({ number }) => number >= 6)
      .map(({ image }) => image)
    expect(eraImages).toHaveLength(10)
    expect(new Set(eraImages)).toHaveLength(10)
    expect(eraImages.every((image) => image.startsWith('eras/') && image.endsWith('.webp'))).toBe(
      true,
    )
  })

  it('keeps the first four eras empty and the KDV era collectible', () => {
    const emptyEraPages = album.pages.filter(({ id }) => id.startsWith('tom-'))
    const kdvPages = album.pages.filter(({ id }) => id.startsWith('kdv-'))

    expect(emptyEraPages).toHaveLength(8)
    expect(emptyEraPages.flatMap(({ slots }) => slots)).toHaveLength(80)
    expect(
      emptyEraPages
        .flatMap(({ slots }) => slots)
        .every(({ playerId }) => !album.cards.some(({ id }) => id === playerId)),
    ).toBe(true)
    expect(kdvPages.flatMap(({ slots }) => slots)).toHaveLength(20)
    expect(
      kdvPages
        .flatMap(({ slots }) => slots)
        .every(({ playerId }) => album.cards.some(({ id }) => id === playerId)),
    ).toBe(true)
  })
})
