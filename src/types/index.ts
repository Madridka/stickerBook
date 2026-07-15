export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'

export interface PlayerCard {
  id: string
  number: number
  firstName: string
  lastName: string
  fullName: string
  image: string
  position: PlayerPosition
  team: string
  weight: number
}

export interface StickerInstance {
  id: string
  playerId: string
  quality: string
  location: string
}
