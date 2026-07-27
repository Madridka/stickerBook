import type { PackOpeningReward } from '@/db/database'

export type RareBlisterOfferStatus = 'available' | 'purchased' | 'expired'

export interface RareBlisterOffer {
  id: string
  rotationId: string
  countryId: string
  price: number
  cardsCount: number
  missingCardChance: number
  generatedAt: number
  expiresAt: number
  purchasedAt: number | null
  extendedUntil: number | null
}

export interface RareShopRotation {
  id: string
  generatedAt: number
  expiresAt: number
  offers: RareBlisterOffer[]
}

export interface RareShopState {
  id: 'current'
  currentRotation: RareShopRotation | null
  extendedOffers: RareBlisterOffer[]
  // Последнее продление сохраняется для совместимости с базовой формой состояния.
  extendedOffer: RareBlisterOffer | null
  lastExtensionDate: string | null
  extendedOfferId: string | null
  hasSeenRareShopInfo: boolean
}

export interface CountryOfferCandidate {
  countryId: string
  totalCards: number
  ownedCards: number
  missingCards: number
  weight: number
}

export interface RareBlisterContents {
  rewards: PackOpeningReward[]
  guaranteeRollSucceeded: boolean
}

export type RareBlisterPurchaseStatus =
  | 'purchased'
  | 'insufficient-funds'
  | 'unavailable'
  | 'opening-in-progress'

export type RareBlisterExtensionStatus =
  | 'extended'
  | 'unavailable'
  | 'already-used-today'
