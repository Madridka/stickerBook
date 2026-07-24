import worldCup2026Album from '@/data/wc-26/album'
import type {
  JournalDefinition,
  JournalId,
  CollectionJournalDefinition,
} from '@/features/journals/types'
import tomskFootballHistoryJournal from './data/tomsk-football-history/journal'

const worldCup2026Journal = {
  id: 'wc-26',
  route: '/album/wc-26',
  titleKey: 'album.library.items.wc-26.title',
  descriptionKey: 'album.library.items.wc-26.description',
  type: 'collection',
  cover: 'info/cover.webp',
  pages: worldCup2026Album.pages.length,
} satisfies CollectionJournalDefinition

export const journalRegistry: Record<JournalId, JournalDefinition> = {
  'wc-26': worldCup2026Journal,
  'tomsk-football-history': tomskFootballHistoryJournal,
}

export const journals: JournalDefinition[] = Object.values(journalRegistry)

export const isJournalId = (value: string): value is JournalId => value in journalRegistry

export const getJournalById = (value: string): JournalDefinition | undefined =>
  isJournalId(value) ? journalRegistry[value] : undefined
