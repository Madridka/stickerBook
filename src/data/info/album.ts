import type { AlbumGeometryData } from '@/types'

const projectInfoAlbum: AlbumGeometryData = {
  id: 'info',
  stickerRatio: { width: 2, height: 3 },
  pages: [
    {
      id: 'info-cover',
      number: 1,
      image: 'info/cover.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'info-about',
      number: 2,
      image: 'info/info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'info-gameplay',
      number: 3,
      image: 'info/info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'info-system',
      number: 4,
      image: 'info/info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'info-changelog',
      number: 5,
      image: 'info/info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
  ],
}

export default projectInfoAlbum
