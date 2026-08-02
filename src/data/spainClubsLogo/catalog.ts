import { loadCardCatalogs } from '../cardCatalogLoader'
import { parseClubCards } from '@/schemas/clubCard'
import type { CardDefinition, NormalizedCardCatalog, TeamCard } from '@/types/cardCatalog'

const catalogModules = import.meta.glob<unknown>('./**/cards.json', {
  eager: true,
  import: 'default',
})

type ClubCatalogSource = {
  leagueId: string
  cards: TeamCard[]
}

// Черновые лиги загружаются вместе с готовыми, а сортировка сохраняет порядок дивизионов.
const catalogSources: ClubCatalogSource[] = Object.values(catalogModules)
  .map((source): ClubCatalogSource => {
    const sourceCards: TeamCard[] = parseClubCards(source)
    const leagueIds: Set<string> = new Set(sourceCards.map(({ leagueId }) => leagueId ?? ''))
    if (leagueIds.size !== 1) throw new Error('Club catalog must contain exactly one league')

    return { leagueId: sourceCards[0].leagueId ?? '', cards: sourceCards }
  })
  .sort((left, right): number =>
    left.leagueId.localeCompare(right.leagueId, 'en', { numeric: true }),
  )

// Каждый файл лиги остаётся единственным источником списка и метаданных клубов.
export const catalogs: NormalizedCardCatalog[] = catalogSources.flatMap(
  ({ leagueId, cards: sourceCards }): NormalizedCardCatalog[] => {
    const cardNumberCount: number = new Set(sourceCards.map(({ cardNumber }) => cardNumber)).size
    const cardNumberWidth: number = String(sourceCards.length).length
    const cards: TeamCard[] =
      cardNumberCount === sourceCards.length
        ? sourceCards
        : sourceCards.map(
            (card): TeamCard => ({
              ...card,
              cardNumber: String(card.albumSlot).padStart(cardNumberWidth, '0'),
            }),
          )
    const leagueIds: Set<string> = new Set(cards.map(({ leagueId }) => leagueId ?? ''))
    if (leagueIds.size !== 1) throw new Error('Club catalog must contain exactly one league')

    return loadCardCatalogs(
      [
        {
          schemaVersion: 2,
          collectionId: 'spainClubsLogo',
          teamId: leagueId,
          defaults: {
            rarity: 'uncommon',
            series: 'base',
            finish: 'standard',
            acquisition: [{ type: 'pack', poolId: 'spain-clubs-logo-development' }],
          },
          cards,
        },
      ],
      import.meta.env.BASE_URL,
      1,
      cards.length,
    )
  },
)

export const cards: CardDefinition[] = catalogs.flatMap((catalog) => catalog.cards)
export const cardById: ReadonlyMap<string, CardDefinition> = new Map(
  cards.map((card) => [card.id, card]),
)

export default cards
