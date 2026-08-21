import { loadCardCatalogs } from '../cardCatalogLoader'
import { parseClubCards } from '@/schemas/clubCard'
import type { CardDefinition, NormalizedCardCatalog, TeamCard } from '@/types/cardCatalog'

const catalogModules = import.meta.glob<unknown>('./**/cards.json', {
  eager: true,
  import: 'default',
})

export const catalogs: NormalizedCardCatalog[] = Object.values(catalogModules)
  .map((source): { teamId: string; cards: TeamCard[] } => {
    const sourceCards: TeamCard[] = parseClubCards(source)
    const teamId: string = sourceCards[0].id.replace(/-\d+$/, '')
    const cards: TeamCard[] = sourceCards.map(
      (card, index): TeamCard => ({ ...card, albumSlot: index + 1 }),
    )
    return { teamId, cards }
  })
  .sort((left, right): number => left.teamId.localeCompare(right.teamId, 'en', { numeric: true }))
  .flatMap(({ teamId, cards }): NormalizedCardCatalog[] => loadCardCatalogs(
    [
      {
        schemaVersion: 2,
        collectionId: 'englandClubsLogo',
        teamId,
        defaults: {
          rarity: 'uncommon',
          series: 'base',
          finish: 'standard',
          acquisition: [{ type: 'pack', poolId: 'england-clubs-logo-standard' }],
        },
        cards,
      },
    ],
    import.meta.env.BASE_URL,
    1,
    cards.length,
  ))

export const cards: CardDefinition[] = catalogs.flatMap((catalog) => catalog.cards)
export const cardById: ReadonlyMap<string, CardDefinition> = new Map(
  cards.map((card) => [card.id, card]),
)

export default cards
