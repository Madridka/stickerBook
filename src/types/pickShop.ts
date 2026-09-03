import type { AlbumId } from './album.ts'

export type PickOfferKind = 'random' | 'album'
export type PickOfferTier = 'standard' | 'premium'

interface PickShopOfferBase {
  id: string
  cost: number
  titleKey: string
  descriptionKey: string
  priority: number
  guaranteedNew: boolean
  tier: PickOfferTier
}

export interface AlbumPickShopOffer extends PickShopOfferBase {
  kind: 'album'
  albumId: AlbumId
}

export interface CatalogPickShopOffer extends PickShopOfferBase {
  kind: 'random'
  albumId?: never
}

export type PickShopOffer = AlbumPickShopOffer | CatalogPickShopOffer

export interface PickCandidateRef {
  albumId: AlbumId
  playerId: string
}
