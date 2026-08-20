import clubsSource from './russia/clubs.json'
import type {
  AlbumGeometryData,
  AlbumGeometryPage,
  AlbumGeometrySlot,
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

interface RussianClub {
  id: string
  displayName: string
  section: string
}

interface AlbumSectionDefinition {
  id: string
}

const clubs: RussianClub[] = clubsSource as RussianClub[]
const sections: AlbumSectionDefinition[] = [
  { id: 'rpl' },
  { id: 'first-league' },
  { id: 'second-a-gold' },
  { id: 'second-a-silver' },
  { id: 'second-b-g1' },
  { id: 'second-b-g2' },
  { id: 'second-b-g3' },
  { id: 'second-b-g4' },
]

const createSlots = (pageClubs: RussianClub[]): AlbumGeometrySlot[] =>
  pageClubs.map((club, slotIndex): AlbumGeometrySlot => {
    const [x, y] = slotPositions[slotIndex]
    return {
      id: club.id,
      playerId: club.id,
      name: club.displayName,
      x,
      y,
      width: SLOT_WIDTH,
    }
  })

const pages: AlbumGeometryPage[] = [
  {
    id: 'russia-clubs-logo-cover',
    number: 1,
    image: 'info/cover.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'russia-clubs-logo-history',
    number: 2,
    image: 'info/info-left.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'russia-clubs-logo-contents',
    number: 3,
    image: 'info/info-right.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
]

// Каждый дивизион или группа начинается с левой страницы и занимает целый разворот.
sections.forEach((section): void => {
  const sectionClubs: RussianClub[] = clubs.filter(({ section: clubSection }) => clubSection === section.id)
  if (sectionClubs.length === 0) throw new Error(`Russian club album section ${section.id} has no clubs`)

  const cardPageCount: number = Math.ceil(sectionClubs.length / CARDS_PER_PAGE)
  const sectionPageCount: number = cardPageCount + (cardPageCount % 2)
  for (let sectionPageIndex = 0; sectionPageIndex < sectionPageCount; sectionPageIndex += 1) {
    const pageNumber: number = pages.length + 1
    const pageSide: 'left' | 'right' = pageNumber % 2 === 0 ? 'left' : 'right'
    const pageClubs: RussianClub[] = sectionPageIndex >= cardPageCount
      ? []
      : sectionClubs.slice(
          sectionPageIndex * CARDS_PER_PAGE,
          (sectionPageIndex + 1) * CARDS_PER_PAGE,
        )

    pages.push({
      id: `russia-clubs-logo-${pageNumber}`,
      number: pageNumber,
      image: `russia-${section.id}-${pageSide}.webp`,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      slots: createSlots(pageClubs),
    })
  }
})

const russiaClubsLogoAlbum: AlbumGeometryData = {
  id: 'russiaClubsLogo',
  stickerRatio: { width: 2, height: 3 },
  pages,
}

export default russiaClubsLogoAlbum
