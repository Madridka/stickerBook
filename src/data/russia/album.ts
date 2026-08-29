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
    id: 'rpl-26-27-cover',
    number: 1,
    image: 'info/cover.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'rpl-26-27-info',
    number: 2,
    image: 'info/about.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'rpl-26-27-details',
    number: 3,
    image: 'info/about.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'rpl-26-27-contents-1',
    number: 4,
    image: 'info/contents.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'rpl-26-27-contents-2',
    number: 5,
    image: 'info/contents.webp',
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
      image: `pages/team-${pageIndex === 0 ? 'left' : 'right'}.webp`,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      slots: createSlots(pageCards),
    })
  }
})

const album: AlbumGeometryData = {
  id: 'rpl-26-27',
  stickerRatio: { width: 2, height: 3 },
  pages,
}

export default album
