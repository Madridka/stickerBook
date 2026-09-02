import type { AlbumId } from './album'

export type PickOfferKind = 'random' | 'album' | 'premium'

export interface PickShopOffer {
  id: string
  kind: PickOfferKind
  cost: number
  albumId?: AlbumId
  titleKey: string
  descriptionKey: string
  priority: number
  guaranteedNew: boolean
}

export interface PickCandidateRef {
  albumId: AlbumId
  playerId: string
}
