export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type StickerLocation = 'inventory' | 'collection' | 'album' | 'duplicate' | 'deleted'

export type {
  AlbumCard,
  AlbumContentsItem,
  AlbumDefinition,
  AlbumDropSettings,
  AlbumEditorialFeature,
  AlbumEditorialContentsItem,
  AlbumEditorialContentsSection,
  AlbumEditorialPageAlign,
  AlbumEditorialPageDefinition,
  AlbumEditorialPageKind,
  AlbumEditorialPageTone,
  AlbumId,
  AlbumLayout,
  AlbumPage,
  AlbumProgress,
  AlbumSpread,
  AlbumTheme,
  BlisterDefinition,
  CardId,
  PageId,
} from './album'

export type { BlisterConfig, CardCatalogConfig, PackConfig } from './gameConfig'

export type {
  AlbumPickShopOffer,
  CatalogPickShopOffer,
  PickCandidateRef,
  PickOfferKind,
  PickShopOffer,
} from './pickShop'

export type {
  AcquisitionSource,
  BaseCard,
  CardDefinition,
  Card as CatalogCard,
  CardCatalog,
  CardCatalogDefaults,
  CardFinish,
  CardKind,
  CardRarity,
  CardSeries,
  CoachCard,
  CoachRole,
  ClubCardMetadata,
  NormalizedCardCatalog,
  PlayerCard as CatalogPlayerCard,
  PlayerCardDefinition,
  SpecialCard,
  TeamCard,
} from './cardCatalog'

export interface StickerInstance {
  id: string
  albumId: import('./album').AlbumId
  playerId: string
  quality: number
  location: StickerLocation
  preparation?: StickerPreparation
  placement?: StickerPlacement
  isAlbumDisplay?: boolean
}

export interface DeletedCard {
  id: string
  albumId: import('./album').AlbumId
  instanceId: string
  playerId: string
  deletedAt: number
  previousLocation?: Exclude<StickerLocation, 'deleted' | 'duplicate'>
}

export interface StickerPreparation {
  quality: number
  alignmentX: number
  alignmentY: number
}

export interface StickerPlacement {
  slotId: string
  x: number
  y: number
  rotation: number
  accuracy?: number
}

export interface AlbumGeometrySlot {
  id: string
  playerId: string
  name: string
  x: number
  y: number
  width: number
}

export interface AlbumGeometryPage {
  id: string
  number: number
  image: string
  width: number
  height: number
  sectionTitleKey?: string
  slots: AlbumGeometrySlot[]
}

export interface AlbumGeometryData {
  id: string
  stickerRatio: {
    width: number
    height: number
  }
  pages: AlbumGeometryPage[]
}

export type StickerDropGrade = 'perfect' | 'near' | 'far'

export interface StickerDropResult {
  instanceId: string
  playerId: string
  slotId: string
  x: number
  y: number
  distance: number
  accuracy: number
  quality: number
  grade: StickerDropGrade
}

export interface StickerTrayItem {
  card: import('./cardCatalog').CardDefinition
  instance: StickerInstance
}

export interface CollectionItem {
  instance: StickerInstance
  duplicateCount: number
}
