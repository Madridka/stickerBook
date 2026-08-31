import manifest from './manifest.json'
import { loadCardCatalogs } from '../cardCatalogLoader.ts'
import type { CardDefinition, NormalizedCardCatalog } from '../../types/cardCatalog.ts'

const catalogModules = import.meta.glob<unknown>('./RPL/*/cards.json', {
  eager: true,
  import: 'default',
})

export const catalogs: NormalizedCardCatalog[] = loadCardCatalogs(
  Object.values(catalogModules),
  import.meta.env.BASE_URL,
  manifest.expectedClubCount,
  manifest.cardsPerClub,
)
export const cards: CardDefinition[] = catalogs.flatMap((catalog) => catalog.cards)
export const cardById: ReadonlyMap<string, CardDefinition> = new Map(
  cards.map((card) => [card.id, card]),
)

export default cards
