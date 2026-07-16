export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type CardType = 'logo' | 'player' | 'squad'

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
  location: string
  placement?: StickerPlacement
}

export interface StickerPlacement {
  slotId: string
  x: number
  y: number
  rotation: number
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
  width: number
  height: number
  slots: AlbumGeometrySlot[]
}

export interface CollectionItem {
  instance: StickerInstance
  duplicateCount: number
}
