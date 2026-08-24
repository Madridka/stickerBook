import { loadCardCatalogs } from '../cardCatalogLoader'
import { parseClubCards } from '@/schemas/clubCard'
import type { CardDefinition, NormalizedCardCatalog, TeamCard } from '@/types/cardCatalog'

const catalogModules = import.meta.glob<unknown>('./**/cards.json', {
  eager: true,
  import: 'default',
})

// Каждый дивизион или группа образует отдельную команду каталога, поэтому номера слотов
// могут начинаться с единицы в каждом журнальном разделе.
export const catalogs: NormalizedCardCatalog[] = Object.values(catalogModules)
  .map((source): { teamId: string; cards: TeamCard[] } => {
    const cards: TeamCard[] = parseClubCards(source)
    const teamId: string = cards[0].id.replace(/-\d+$/, '')
    return { teamId, cards }
  })
  .sort((left, right): number => left.teamId.localeCompare(right.teamId, 'en', { numeric: true }))
  .flatMap(({ teamId, cards }): NormalizedCardCatalog[] => {
    return loadCardCatalogs(
      [
        {
          schemaVersion: 2,
          collectionId: 'russiaClubsLogo',
          teamId,
          defaults: {
            rarity: 'common',
            series: 'base',
            finish: 'standard',
            acquisition: [{ type: 'pack', poolId: 'russia-clubs-logo-standard' }],
          },
          cards,
        },
      ],
      import.meta.env.BASE_URL,
      1,
      cards.length,
    )
  })

export const cards: CardDefinition[] = catalogs.flatMap((catalog) => catalog.cards)
export const cardById: ReadonlyMap<string, CardDefinition> = new Map(
  cards.map((card) => [card.id, card]),
)

export default cards
