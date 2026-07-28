import pagesData from './pages.json'
import type { AlbumGeometryData, AlbumGeometryPage } from '@/types'

const playerPages: AlbumGeometryPage[] = pagesData.map(
  (page, index): AlbumGeometryPage => ({
    ...page,
    number: index + 4,
  }),
)

const kdvAlbum: AlbumGeometryData = {
  id: 'kdv',
  stickerRatio: { width: 2, height: 3 },
  pages: [
    {
      id: 'kdv-cover',
      number: 1,
      image: 'info/cover.png',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'kdv-about',
      number: 2,
      image: 'info/info-left.png',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'kdv-team',
      number: 3,
      image: 'info/info-right.png',
      width: 1536,
      height: 1200,
      slots: [],
    },
    ...playerPages,
  ],
}

export default kdvAlbum
