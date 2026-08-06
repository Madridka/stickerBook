import tom2000Cards from './1. tom (2000-2004)/cards.json'
import tom2005Cards from './2. tom (2005-2007)/cards.json'
import tom2008Cards from './3. tom (2008-2012)/cards.json'
import tom2013Cards from './4. tom (2013-2022)/cards.json'
import kdvPages from './5. kdv (2022)/pages.json'
import type { AlbumGeometryData, AlbumGeometryPage, AlbumGeometrySlot } from '@/types'

type EraCard = {
  cardNumber: string
  displayName: string
}

const slotPositions: ReadonlyArray<Pick<AlbumGeometrySlot, 'x' | 'y' | 'width'>> = [
  { x: 500, y: 130, width: 200 },
  { x: 836, y: 130, width: 200 },
  { x: 180, y: 465, width: 200 },
  { x: 512, y: 465, width: 200 },
  { x: 844, y: 465, width: 200 },
  { x: 1176, y: 465, width: 200 },
  { x: 180, y: 800, width: 200 },
  { x: 512, y: 800, width: 200 },
  { x: 844, y: 800, width: 200 },
  { x: 1176, y: 800, width: 200 },
]

const createEraPage = (
  eraId: string,
  titleKey: string,
  side: 'left' | 'right',
  number: number,
  cards: EraCard[],
): AlbumGeometryPage => ({
  id: `${eraId}-${side}`,
  number,
  image: `eras/${eraId}-${side}.webp`,
  width: 1536,
  height: 1200,
  sectionTitleKey: titleKey,
  slots: cards.map((card, index): AlbumGeometrySlot => {
    const position = slotPositions[index]
    if (!position) throw new Error(`${eraId}: too many cards on ${side} page`)
    const id = `${eraId}-${card.cardNumber}`
    return { id, playerId: id, name: card.displayName, ...position }
  }),
})

const createEraSpread = (
  eraId: string,
  titleKey: string,
  firstPageNumber: number,
  cards: EraCard[],
): AlbumGeometryPage[] => [
  createEraPage(eraId, titleKey, 'left', firstPageNumber, cards.slice(0, 10)),
  createEraPage(eraId, titleKey, 'right', firstPageNumber + 1, cards.slice(10, 20)),
]

const kdvPlayerPages: AlbumGeometryPage[] = kdvPages.map(
  (page, index): AlbumGeometryPage => ({
    ...page,
    number: index + 14,
    image: `eras/${page.id}.webp`,
    sectionTitleKey: 'album.sectionTitles.tomsk.kdv',
  }),
)

const tomskAlbum: AlbumGeometryData = {
  id: 'tomsk',
  stickerRatio: { width: 2, height: 3 },
  pages: [
    {
      id: 'tomsk-cover',
      number: 1,
      image: 'info/cover.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'tomsk-about',
      number: 2,
      image: 'info/about-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'tomsk-history',
      number: 3,
      image: 'info/about-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'tomsk-contents-first',
      number: 4,
      image: 'info/contents-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'tomsk-contents-second',
      number: 5,
      image: 'info/contents-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    ...createEraSpread('tom-2000', 'album.sectionTitles.tomsk.tom2000', 6, tom2000Cards.cards),
    ...createEraSpread('tom-2005', 'album.sectionTitles.tomsk.tom2005', 8, tom2005Cards.cards),
    ...createEraSpread('tom-2008', 'album.sectionTitles.tomsk.tom2008', 10, tom2008Cards.cards),
    ...createEraSpread('tom-2013', 'album.sectionTitles.tomsk.tom2013', 12, tom2013Cards.cards),
    ...kdvPlayerPages,
  ],
}

export default tomskAlbum
