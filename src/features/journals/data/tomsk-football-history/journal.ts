import type { HistoricalJournalDefinition } from '@/features/journals/types'
import spreads from './eras'
import players from './players'

const tomskFootballHistoryJournal = {
  id: 'tomsk-football-history',
  route: '/album/tomsk-football-history',
  titleKey: 'album.library.items.tomsk-football-history.title',
  descriptionKey: 'album.library.items.tomsk-football-history.description',
  type: 'historical',
  cover: '/journals/tomsk-football-history/cover.svg',
  pages: spreads.length * 2,
  isPreUnlocked: true,
  isPrePlaced: true,
  spreads,
  players,
} satisfies HistoricalJournalDefinition

export default tomskFootballHistoryJournal
