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
  level: number
  section: string
  league: string
  division: string
  clubs: Array<{ id: string }>
}

export interface EnglandDivisionPageRange {
  division: string
  endPage: number
  level: number
  logo: string
  section: string
  startPage: number
}

const getDivisionLogo = (league: string): string => {
  if (league === 'Premier League') return '/leagueLogos/england/premier-league.png'
  if (league === 'EFL Championship') return '/leagueLogos/england/efl-championship.png'
  if (league === 'EFL League One') return '/leagueLogos/england/efl-league-one.png'
  if (league === 'EFL League Two') return '/leagueLogos/england/efl-league-two.png'
  if (league.startsWith('National League')) return '/leagueLogos/england/national-league.png'
  if (league.startsWith('Isthmian League')) return '/leagueLogos/england/isthmian-league.png'
  if (league.startsWith('Northern Premier League')) return '/leagueLogos/england/northern-premier-league.png'
  if (league.startsWith('Southern League')) return '/leagueLogos/england/southern-league.png'
  if (league.startsWith('Combined Counties')) return '/leagueLogos/england/combined-counties.png'
  if (league.startsWith('Eastern Counties')) return '/leagueLogos/england/eastern-counties.png'
  if (league.startsWith('Essex Senior')) return '/leagueLogos/england/essex-senior.png'
  if (league.startsWith('Hellenic')) return '/leagueLogos/england/hellenic.png'
  if (league.startsWith('Midland')) return '/leagueLogos/england/midland.png'
  if (league.startsWith('North West Counties')) return '/leagueLogos/england/north-west-counties.png'
  if (league.startsWith('Northern Counties East')) return '/leagueLogos/england/northern-counties-east.png'
  if (league.startsWith('Northern Football')) return '/leagueLogos/england/northern-football.png'
  if (league.startsWith('South West Peninsula')) return '/leagueLogos/england/south-west-peninsula.png'
  if (league.startsWith('Southern Combination')) return '/leagueLogos/england/southern-combination.png'
  if (league.startsWith('Southern Counties East')) return '/leagueLogos/england/southern-counties-east.png'
  if (league.startsWith('Spartan South Midlands')) return '/leagueLogos/england/spartan-south-midlands.png'
  if (league.startsWith('United Counties')) return '/leagueLogos/england/united-counties.png'
  if (league.startsWith('Wessex')) return '/leagueLogos/england/wessex.png'
  if (league.startsWith('Western')) return '/leagueLogos/england/western.png'
  throw new Error(`Missing England division logo: ${league}`)
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
  {
    id: 'england-clubs-logo-contents-2',
    number: 4,
    image: 'info/info-left.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
  {
    id: 'england-clubs-logo-contents-3',
    number: 5,
    image: 'info/info-right.webp',
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    slots: [],
  },
]

export const englandDivisionPageRanges: EnglandDivisionPageRange[] = []

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
  const startPage = pages.length + 1
  englandDivisionPageRanges.push({
    division: division.league === division.division
      ? division.league
      : `${division.league}: ${division.division}`,
    endPage: startPage + divisionPageCount - 1,
    level: division.level,
    logo: getDivisionLogo(division.league),
    section: division.section,
    startPage,
  })
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
