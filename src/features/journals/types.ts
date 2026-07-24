export type JournalId = 'wc-26' | 'tomsk-football-history'
export type JournalType = 'collection' | 'historical'
export type JournalCardPosition = 'top' | 'bottom-left' | 'bottom-right'

export interface JournalCatalogItem {
  id: JournalId
  route: string
  titleKey: string
  descriptionKey: string
  type: JournalType
  cover: string
  pages: number
}

export interface JournalCardPlacement {
  cardId: string
  position: JournalCardPosition
}

export interface JournalPageDefinition {
  id: string
  cards: JournalCardPlacement[]
}

export interface JournalSpreadDefinition {
  id: string
  title: string
  subtitle?: string
  leftPage: JournalPageDefinition
  rightPage: JournalPageDefinition
}

export interface HistoricalPlayerInfo {
  playerId: string
  fullName: string
  shortName: string
  eraId: string
  eraTitle: string
  position?: string
  tomskPeriod?: string
  biography: string
  contribution: string
  keyMoments?: string[]
  image: string
}

export interface CollectionJournalDefinition extends JournalCatalogItem {
  type: 'collection'
}

export interface HistoricalJournalDefinition extends JournalCatalogItem {
  type: 'historical'
  isPreUnlocked: true
  isPrePlaced: true
  spreads: JournalSpreadDefinition[]
  players: Record<string, HistoricalPlayerInfo>
}

export type JournalDefinition = CollectionJournalDefinition | HistoricalJournalDefinition

export interface JournalProgressRecord {
  journalId: JournalId
  lastPage: number
  unlockedEraIds: string[]
  viewedPlayerIds: string[]
  openedBackPlayerIds: string[]
  completedEraIds: string[]
  updatedAt: number
}
