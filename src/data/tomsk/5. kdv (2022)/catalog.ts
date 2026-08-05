import rawCatalog from './cards.json'
import { loadCardCatalogs } from '../../cardCatalogLoader'
import type { NormalizedCardCatalog, PlayerPosition } from '@/types/cardCatalog'

const positionAliases: Readonly<Record<string, PlayerPosition>> = {
  goalkeeper: 'GK',
  defender: 'DF',
  midfielder: 'MF',
  forward: 'FW',
}

// Приводит исторические названия позиций КДВ к общей строгой схеме карточек.
const normalizedInput: unknown = {
  ...rawCatalog,
  collectionId: 'tomsk',
  teamId: 'tomsk',
  cards: rawCatalog.cards.map((card) => {
    if (card.kind !== 'player') return card

    const rawPosition: string | undefined = card.position
    const position: PlayerPosition | undefined = rawPosition
      ? positionAliases[rawPosition]
      : undefined
    if (!position) throw new Error(`Unknown KDV player position: ${rawPosition ?? 'missing'}`)
    return {
      ...card,
      personId: card.id,
      position,
    }
  }),
}

export const catalogs: NormalizedCardCatalog[] = loadCardCatalogs(
  [normalizedInput],
  import.meta.env.BASE_URL,
  1,
  rawCatalog.cards.filter(({ series }) => series === 'base').length,
)
export const cards = catalogs.flatMap((catalog) => catalog.cards)
export const cardById = new Map(cards.map((card) => [card.id, card]))

export default cards
