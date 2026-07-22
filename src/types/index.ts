export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type StickerLocation = 'inventory' | 'collection' | 'album' | 'duplicate' | 'deleted'

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
  NormalizedCardCatalog,
  PlayerCard as CatalogPlayerCard,
  PlayerCardDefinition,
  TeamCard,
} from './cardCatalog'

export interface StickerInstance {
  id: string
  playerId: string
  quality: number
  location: StickerLocation
  preparation?: StickerPreparation
  placement?: StickerPlacement
  isAlbumDisplay?: boolean
}

export interface DeletedCard {
  id: string
  instanceId: string
  playerId: string
  deletedAt: number
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
