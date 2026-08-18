import type { LeaderboardAlbumId } from '../config/gameBalance.ts'

export type { LeaderboardAlbumId }

export interface LeaderboardPlayer {
  position: number
  userId: string
  username: string
  totalCards: number
  albums: Record<LeaderboardAlbumId, number>
}

export interface LeaderboardResponse {
  minimumCards: number
  generatedAt: number
  nextRefreshAt: number
  players: LeaderboardPlayer[]
}

export interface LeaderboardAlbumDetails {
  albumId: string
  totalCards: number
  placedCards: number
}

export interface LeaderboardPlayerProfile extends LeaderboardPlayer {
  uniqueCards: number
  duplicateCards: number
  placedCards: number
  completedTasks: number
  completedGoals: number
  completedDailyTasks: number
  createdAt: number
  saveUpdatedAt: number
  albumDetails: LeaderboardAlbumDetails[]
}

export interface LeaderboardProfileResponse {
  generatedAt: number
  nextRefreshAt: number
  player: LeaderboardPlayerProfile
}
