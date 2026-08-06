import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
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
      'tom04-left',
      'tom07-left',
      'tom12-left',
      'tom22-left',
      'kdv-left',
    ])
    expect(getLibraryAlbums().some(({ id }) => id === 'tomsk')).toBe(true)
  })

  it('uses Tomsk-owned WebP assets and a dedicated two-page background for every era', () => {
    expect(album.theme.coverImage).toBe('info/cover.webp')
    expect(album.metadata.assetAlbumId).toBeUndefined()
    expect(album.metadata.cardAssetAlbumIds).toEqual(['tomsk', 'kdv'])

    const eraImages = album.pages
      .filter(({ number }) => number >= 6)
      .map(({ image }) => image)
    expect(eraImages).toHaveLength(10)
    expect(new Set(eraImages)).toHaveLength(10)
    expect(eraImages.every((image) => image.startsWith('eras/') && image.endsWith('.webp'))).toBe(
      true,
    )
  })

  it('registers all five eras as a 100-card collectible catalog', () => {
    const historicalEraIds = ['tom04', 'tom07', 'tom12', 'tom22']
    const historicalEraPages = album.pages.filter(({ id }) =>
      historicalEraIds.some((eraId) => id.startsWith(`${eraId}-`)),
    )
    const kdvPages = album.pages.filter(({ id }) => id.startsWith('kdv-'))

    expect(album.cards).toHaveLength(100)
    expect(historicalEraPages).toHaveLength(8)
    expect(historicalEraPages.flatMap(({ slots }) => slots)).toHaveLength(80)
    expect(
      historicalEraPages
        .flatMap(({ slots }) => slots)
        .every(({ playerId }) => album.cards.some(({ id }) => id === playerId)),
    ).toBe(true)
    expect(kdvPages.flatMap(({ slots }) => slots)).toHaveLength(20)
    expect(
      kdvPages
        .flatMap(({ slots }) => slots)
        .every(({ playerId }) => album.cards.some(({ id }) => id === playerId)),
    ).toBe(true)
    expect(
      album.cards.every(({ image }) =>
        existsSync(resolve('public', image.replace(/^\/+/, ''))),
      ),
    ).toBe(true)
  })

  it('offers three cards from every Tomsk era with a one-hour cooldown', () => {
    const blister = album.blisters.find(({ id }) => id === 'kdv')
    expect(blister).toMatchObject({ cost: 50, cardCount: 3, cooldownMs: 60 * 60 * 1_000 })
    expect(new Set(album.catalogs.map(({ teamId }) => teamId))).toEqual(
      new Set(['tom04', 'tom07', 'tom12', 'tom22', 'kdv']),
    )
  })
})
