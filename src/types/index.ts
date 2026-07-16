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
  quality: string
  location: string
}
