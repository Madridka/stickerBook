import tom04Cards from './tom04/cards.json'
import tom07Cards from './tom07/cards.json'
import tom12Cards from './tom12/cards.json'
import tom22Cards from './tom22/cards.json'
import kdvCards from './5. kdv (2022)/cards.json'
import { loadCardCatalogs } from '../cardCatalogLoader'
import type { CardDefinition, NormalizedCardCatalog, PlayerPosition } from '@/types/cardCatalog'

const positionAliases: Readonly<Record<string, PlayerPosition>> = {
  goalkeeper: 'GK',
  defender: 'DF',
  midfielder: 'MF',
  forward: 'FW',
}

const eras = [
  { id: 'tom04', source: tom04Cards },
  { id: 'tom07', source: tom07Cards },
  { id: 'tom12', source: tom12Cards },
  { id: 'tom22', source: tom22Cards },
  { id: 'kdv', source: kdvCards },
] as const

interface HistoricalRawCard {
  id: string
  cardNumber: string
  displayName: string
  image: string
  kind: string
  position?: string
  personId?: string
  [key: string]: unknown
}

// Исторические списки получают общий albumId, а окончательные ID и пути хранятся в JSON эпох.
const inputs: unknown[] = eras.map(({ id: eraId, source }) => ({
  ...source,
  collectionId: 'tomsk',
  teamId: eraId,
  defaults: {
    ...source.defaults,
    acquisition: [{ type: 'pack', poolId: 'standard' }],
  },
  cards: (source.cards as HistoricalRawCard[]).map((card) => {
    const position: PlayerPosition | undefined =
      card.kind === 'player' && card.position ? positionAliases[card.position] : undefined
    if (card.kind === 'player' && !position) {
      throw new Error(`${eraId}: unknown player position ${card.position}`)
    }
    return {
      ...card,
      personId: card.personId ?? card.id,
      ...(position ? { position } : {}),
    }
  }),
}))

export const catalogs: NormalizedCardCatalog[] = loadCardCatalogs(
  inputs,
  import.meta.env.BASE_URL,
  eras.length,
  20,
)
export const cards: CardDefinition[] = catalogs.flatMap((catalog) => catalog.cards)
export const cardById: ReadonlyMap<string, CardDefinition> = new Map(
  cards.map((card) => [card.id, card]),
)

export default cards
