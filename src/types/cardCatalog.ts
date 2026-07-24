export type CardKind = 'team' | 'coach' | 'player'
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type CoachRole = 'HEAD_COACH'
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type CardSeries = 'base' | 'special' | 'moment' | 'legend'
export type CardFinish = 'standard' | 'foil' | 'holographic'

export type AcquisitionSource =
  | {
      type: 'pack'
      poolId: string
    }
  | {
      type: 'challenge'
      challengeId: string
    }
  | {
      type: 'minigame'
      minigameId: string
    }
  | {
      type: 'event'
      eventId: string
    }

export interface BaseCard {
  id: string
  cardNumber: string
  albumSlot?: number
  kind: CardKind
  displayName: string
  image: string
  series: CardSeries
  finish: CardFinish
  baseCardId?: string
  rarity?: CardRarity
  acquisition?: AcquisitionSource[]
  selectionWeight?: number
}

export interface TeamCard extends BaseCard {
  kind: 'team'
}

export interface CoachCard extends BaseCard {
  kind: 'coach'
  personId: string
  role: CoachRole
}

export interface PlayerCard extends BaseCard {
  kind: 'player'
  personId: string
  position: PlayerPosition
  rarity: CardRarity
  shirtNumber?: number
}

export type Card = TeamCard | CoachCard | PlayerCard

type NormalizedCardFields = Required<
  Pick<BaseCard, 'rarity' | 'series' | 'finish' | 'acquisition' | 'selectionWeight'>
>

type NormalizeCard<T extends Card> = T extends Card
  ? Omit<T, keyof NormalizedCardFields> & NormalizedCardFields
  : never

export type CardDefinition = NormalizeCard<Card> & {
  collectionId: string
  teamId: string
}

export type PlayerCardDefinition = Extract<CardDefinition, { kind: 'player' }>

export interface CardCatalogDefaults {
  rarity: CardRarity
  series: CardSeries
  finish: CardFinish
  acquisition: AcquisitionSource[]
}

export interface CardCatalog {
  schemaVersion: 2
  collectionId: string
  teamId: string
  defaults: CardCatalogDefaults
  cards: Card[]
}

export interface NormalizedCardCatalog extends Omit<CardCatalog, 'cards'> {
  cards: CardDefinition[]
}
