export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type CardType = 'logo' | 'player' | 'squad'
export type StickerLocation = 'inventory' | 'collection' | 'album' | 'duplicate'

export interface PlayerCard {
  id: string
  number?: number
  firstName?: string
  lastName?: string
  fullName: string
  image: string
  type: CardType
  team: string
  weight: number
}

export interface StickerInstance {
  id: string
  playerId: string
  quality: number
  location: StickerLocation
  preparation?: StickerPreparation
  placement?: StickerPlacement
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
  card: PlayerCard
  instance: StickerInstance
}

export interface CollectionItem {
  instance: StickerInstance
  duplicateCount: number
}
