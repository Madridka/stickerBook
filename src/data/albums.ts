import type { AlbumGeometryData } from '@/types'
import worldCup2026Album from './wc-26/album'

export interface AlbumCatalogItem {
  id: string
  route: string
  cover: string
  pages: number
}

const countAlbumPages = (album: AlbumGeometryData): number => album.pages.length

const albums: AlbumCatalogItem[] = [
  {
    id: 'wc-26',
    route: '/album/wc-26',
    cover: 'cover.webp',
    pages: countAlbumPages(worldCup2026Album),
  },
]

export default { albums }
