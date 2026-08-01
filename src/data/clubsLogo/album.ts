import cards from './catalog'
import type {
  AlbumGeometryData,
  AlbumGeometryPage,
  AlbumGeometrySlot,
  CardDefinition,
} from '@/types'

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

interface AlbumSectionDefinition {
  id: string
  leagueId: string
  group?: string
}

const sections: AlbumSectionDefinition[] = [
  { id: 'la-liga', leagueId: 'esp1' },
  { id: 'segunda-division', leagueId: 'esp2' },
  ...Array.from({ length: 2 }, (_value, index): AlbumSectionDefinition => ({
    id: `primera-federacion-g${index + 1}`,
    leagueId: 'esp3',
    group: String(index + 1),
  })),
  ...Array.from({ length: 5 }, (_value, index): AlbumSectionDefinition => ({
    id: `segunda-federacion-g${index + 1}`,
    leagueId: 'esp4',
    group: String(index + 1),
  })),
  ...Array.from({ length: 18 }, (_value, index): AlbumSectionDefinition => ({
    id: `tercera-federacion-g${String(index + 1).padStart(2, '0')}`,
    leagueId: 'esp5',
    group: String(index + 1).padStart(2, '0'),
  })),
]

const getCardGroup = (card: CardDefinition): string | undefined =>
  card.id.match(/-g(\d+)-/)?.[1]

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
    id: 'clubs-logo-cover',
    number: 1,
    image: 'info/cover.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'clubs-logo-history',
    number: 2,
    image: 'info/info-left.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'clubs-logo-guide',
    number: 3,
    image: 'info/info-right.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
]

// После обложки и информационного разворота каждая лига или группа занимает
// целое число разворотов. При нечётном числе страниц правая страница остаётся пустой.
sections.forEach((section): void => {
  const sectionCards: CardDefinition[] = cards.filter(
    (card): boolean =>
      card.kind === 'team' &&
      card.leagueId === section.leagueId &&
      (section.group === undefined || getCardGroup(card) === section.group),
  )
  if (sectionCards.length === 0) {
    throw new Error(`Club album section ${section.id} has no cards`)
  }

  const cardPageCount: number = Math.ceil(sectionCards.length / CARDS_PER_PAGE)
  const sectionPageCount: number = cardPageCount + (cardPageCount % 2)

  for (let sectionPageIndex = 0; sectionPageIndex < sectionPageCount; sectionPageIndex += 1) {
    const pageNumber: number = pages.length + 1
    const isEmptyRightPage: boolean = sectionPageIndex >= cardPageCount
    const pageSide: 'left' | 'right' = pageNumber % 2 === 0 ? 'left' : 'right'
    const pageCards: CardDefinition[] = isEmptyRightPage
      ? []
      : sectionCards.slice(
          sectionPageIndex * CARDS_PER_PAGE,
          (sectionPageIndex + 1) * CARDS_PER_PAGE,
        )

    pages.push({
      id: `clubs-logo-${pageNumber}`,
      number: pageNumber,
      image: `spain-${section.id}-${pageSide}.webp`,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      slots: createSlots(pageCards),
    })
  }
})

const clubsLogoAlbum: AlbumGeometryData = {
  id: 'clubsLogo',
  stickerRatio: { width: 2, height: 3 },
  pages,
}

export default clubsLogoAlbum
