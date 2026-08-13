import type {
  CardFinish,
  CardKind,
  CardRarity,
  CardSeries,
  CoachRole,
  PlayerPosition,
} from './cardCatalog.ts'

export interface PackConfig {
  cardsPerPack: number
  rarityOdds: Record<CardRarity, number>
}

export interface BlisterConfig extends PackConfig {
  id: string
  albumId: string
  albumIds: readonly string[]
  titleKey: string
  descriptionKey: string
  shortNameKey: string
  cost: number
  cooldownMs: number
  poolId: string
  pityEligible: boolean
}

export interface CardCatalogConfig {
  schemaVersion: 2
  kinds: CardKind[]
  positions: PlayerPosition[]
  coachRoles: CoachRole[]
  rarities: CardRarity[]
  series: CardSeries[]
  finishes: CardFinish[]
  defaults: {
    rarity: CardRarity
    series: CardSeries
    finish: CardFinish
    selectionWeight: number
  }
}
