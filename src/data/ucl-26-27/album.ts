import cards from './catalog'
import manifest from './manifest.json'
import type { AlbumGeometryData, AlbumGeometryPage, AlbumGeometrySlot, CardDefinition } from '@/types'

const PAGE_WIDTH = 1536
const PAGE_HEIGHT = 1200
const CARDS_PER_PAGE = 10
const SLOT_WIDTH = 220
const slotPositions: ReadonlyArray<readonly [number, number]> = [
  [160, 225],
  [409, 225],
  [658, 225],
  [907, 225],
  [1156, 225],
  [160, 640],
  [409, 640],
  [658, 640],
  [907, 640],
  [1156, 640],
]

const createSlots = (pageCards: CardDefinition[]): AlbumGeometrySlot[] =>
  pageCards.map((card, index): AlbumGeometrySlot => {
    const [x, y] = slotPositions[index]
    return {
      id: `${card.id}-slot`,
      playerId: card.id,
      name: card.displayName,
      x,
      y,
      width: SLOT_WIDTH,
    }
  })

const pages: AlbumGeometryPage[] = [
  {
    id: 'ucl-26-27-cover',
    number: 1,
    image: 'info/cover.png',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'ucl-26-27-season',
    number: 2,
    image: 'info/cover.png',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'ucl-26-27-collection',
    number: 3,
    image: 'pages/team-page.png',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
]

manifest.clubs.forEach((club): void => {
  const clubCards = cards
    .filter((card): boolean => card.teamId === club.teamId)
    .sort((left, right): number => Number(left.cardNumber) - Number(right.cardNumber))

  for (let pageIndex = 0; pageIndex < 2; pageIndex += 1) {
    const pageCards = clubCards.slice(pageIndex * CARDS_PER_PAGE, (pageIndex + 1) * CARDS_PER_PAGE)
    pages.push({
      id: `${club.teamId}-${pageIndex === 0 ? 'left' : 'right'}`,
      number: pages.length + 1,
      image: 'pages/team-page.png',
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      slots: createSlots(pageCards),
    })
  }
})

const album: AlbumGeometryData = {
  id: 'ucl-26-27',
  stickerRatio: { width: 2, height: 3 },
  pages,
}

export default album
