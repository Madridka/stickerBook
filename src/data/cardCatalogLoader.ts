import gameData from './mainConst.json' with { type: 'json' }
import { parseCardCatalog } from '../schemas/cardCatalog.ts'
import type {
  Card,
  CardDefinition,
  CardCatalog,
  NormalizedCardCatalog,
} from '../types/cardCatalog.ts'

const normalizeImagePath = (imagePath: string, assetBaseUrl: string): string =>
  `${assetBaseUrl}${imagePath.replace(/^\/+/, '')}`

const normalizeCard = (
  catalog: CardCatalog,
  card: Card,
  assetBaseUrl: string,
): CardDefinition => ({
  ...card,
  collectionId: catalog.collectionId,
  teamId: catalog.teamId,
  image: normalizeImagePath(card.image, assetBaseUrl),
  rarity: card.rarity ?? catalog.defaults.rarity,
  series: card.series ?? catalog.defaults.series,
  finish: card.finish ?? catalog.defaults.finish,
  acquisition: card.acquisition ?? catalog.defaults.acquisition.map((source) => ({ ...source })),
  selectionWeight: card.selectionWeight ?? gameData.dropEngine.defaultSelectionWeight,
})

// Валидирует импортированные JSON и создаёт новые нормализованные объекты без их мутации.
export const loadCardCatalogs = (
  inputs: readonly unknown[],
  assetBaseUrl = '',
): NormalizedCardCatalog[] => {
  const catalogs = inputs.map(parseCardCatalog)
  if (catalogs.length !== gameData.collection.expectedTeamCount) {
    throw new Error(
      `Expected ${gameData.collection.expectedTeamCount} card catalogs, received ${catalogs.length}`,
    )
  }

  const normalized = catalogs.map(
    (catalog): NormalizedCardCatalog => ({
      ...catalog,
      defaults: {
        ...catalog.defaults,
        acquisition: catalog.defaults.acquisition.map((source) => ({ ...source })),
      },
      cards: catalog.cards.map((card) => normalizeCard(catalog, card, assetBaseUrl)),
    }),
  )
  const ids = normalized.flatMap((catalog) => catalog.cards.map((card) => card.id))
  if (new Set(ids).size !== ids.length) {
    throw new Error('Card ids must be unique across the normalized collection')
  }
  return normalized
}
