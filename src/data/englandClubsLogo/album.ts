import cards from './catalog'
import structureSource from './england/structure.json'
import type { AlbumGeometryData, AlbumGeometryPage, AlbumGeometrySlot } from '@/types'
import type { CardDefinition } from '@/types/cardCatalog'

const PAGE_WIDTH = 1536
const PAGE_HEIGHT = 1200
const CARDS_PER_PAGE = 10
const SLOT_WIDTH = 200
const slotPositions: ReadonlyArray<readonly [number, number]> = [
  [68, 258],
  [368, 258],
  [668, 258],
  [968, 258],
  [1268, 258],
  [68, 690],
  [368, 690],
  [668, 690],
  [968, 690],
  [1268, 690],
]

interface EnglandDivision {
  section: string
  division: string
  clubs: Array<{ id: string }>
}

const divisions = structureSource.divisions as EnglandDivision[]
const cardById = new Map(cards.map((card) => [card.id, card]))

const createSlots = (pageCards: CardDefinition[]): AlbumGeometrySlot[] =>
  pageCards.map((card, slotIndex): AlbumGeometrySlot => {
    const [x, y] = slotPositions[slotIndex]
    return {
      id: card.id,
      playerId: card.id,
      name: card.displayName,
      x,
      y,
      width: SLOT_WIDTH,
    }
  })

const pages: AlbumGeometryPage[] = [
  {
    id: 'england-clubs-logo-cover',
    number: 1,
    image: 'info/cover.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'england-clubs-logo-history',
    number: 2,
    image: 'info/info-left.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'england-clubs-logo-contents',
    number: 3,
    image: 'info/info-right.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
]

// Every division starts on the left and occupies a whole number of spreads.
// Clubs without a verified crest stay in structure.json but do not receive a
// collectible slot or a misleading placeholder card.
divisions.forEach((division): void => {
  const divisionCards = division.clubs
    .map(({ id }) => cardById.get(id))
    .filter((card): card is CardDefinition => Boolean(card))
  if (divisionCards.length === 0) return

  const cardPageCount = Math.ceil(divisionCards.length / CARDS_PER_PAGE)
  const divisionPageCount = cardPageCount + (cardPageCount % 2)
  for (let divisionPageIndex = 0; divisionPageIndex < divisionPageCount; divisionPageIndex += 1) {
    const pageNumber = pages.length + 1
    const pageSide = pageNumber % 2 === 0 ? 'left' : 'right'
    const pageCards = divisionPageIndex >= cardPageCount
      ? []
      : divisionCards.slice(
          divisionPageIndex * CARDS_PER_PAGE,
          (divisionPageIndex + 1) * CARDS_PER_PAGE,
        )

    pages.push({
      id: `england-clubs-logo-${pageNumber}`,
      number: pageNumber,
      image: `england-${division.section}-${pageSide}.webp`,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      slots: createSlots(pageCards),
    })
  }
})

const englandClubsLogoAlbum: AlbumGeometryData = {
  id: 'englandClubsLogo',
  stickerRatio: { width: 2, height: 3 },
  pages,
}

export default englandClubsLogoAlbum
