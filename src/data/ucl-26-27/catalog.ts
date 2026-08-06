import manifest from './manifest.json'
import provisionalCatalogs from './provisionalCatalogs'
import { loadCardCatalogs } from '../cardCatalogLoader.ts'
import type { CardDefinition, NormalizedCardCatalog } from '../../types/cardCatalog.ts'

const discoveredCatalogModules = import.meta.glob<unknown>('./*/cards.json', {
  eager: true,
  import: 'default',
})
const catalogModules: Record<string, unknown> = {
  ...discoveredCatalogModules,
  ...provisionalCatalogs,
}

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
