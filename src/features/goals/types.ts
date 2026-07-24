import type { RouteLocationRaw } from 'vue-router'
import type { CardRarity } from '@/types'

export type GoalCategory =
  | 'collection'
  | 'album'
  | 'packs'
  | 'minigames'
  | 'economy'
  | 'progression'

export type GoalStatus = 'locked' | 'active' | 'completed' | 'claimed'

export type GoalCounterId =
  | 'coins-earned'
  | 'packs-purchased'
  | 'packs-opened'
  | 'minigames-completed'
  | 'duplicates-exchanged'

export type GoalRequirement =
  | { type: 'goal-completed'; goalId: string }
  | { type: 'coins-earned'; target: number }
  | { type: 'packs-purchased'; target: number }
  | { type: 'packs-opened'; target: number }
  | { type: 'unique-cards-collected'; target: number }
  | { type: 'stickers-prepared'; target: number }
  | { type: 'stickers-placed'; target: number }
  | { type: 'album-slots-filled'; albumId: string; target: number }
  | { type: 'album-progress'; albumId: string; targetPercent: number }
  | { type: 'album-page-filled'; albumId: string; pageId: string; target: number }
  | { type: 'minigames-completed'; target: number }
  | { type: 'duplicates-exchanged'; target: number }
  | { type: 'rarity-collected'; rarity: CardRarity; target: number }
  | { type: 'variant-collected'; target: number }

export type GoalReward =
  | { type: 'coins'; amount: number }
  | { type: 'energy'; amount: number }
  | { type: 'pack'; packId: string; amount: number }

export interface GoalDefinition {
  id: string
  category: GoalCategory
  title: string
  description: string
  order: number
  requirements: GoalRequirement[]
  reward: GoalReward[]
  action?: {
    label: string
    route: RouteLocationRaw
  }
}

export interface GoalProgress {
  current: number
  target: number
}

export interface GoalPlayerState {
  goalId: string
  completedAt?: number
  claimedAt?: number
}

export interface GoalCounter {
  id: GoalCounterId
  value: number
  updatedAt: number
}

export interface GoalProgressContext {
  counters: Partial<Record<GoalCounterId, number>>
  uniqueCardsCollected: number
  stickersPrepared: number
  stickersPlaced: number
  albumSlotsFilled: Record<string, number>
  albumProgress: Record<string, number>
  albumPagesFilled: Record<string, Record<string, number>>
  rarityCollected: Partial<Record<CardRarity, number>>
  variantsCollected: number
}

export interface GoalRuntimeState {
  definition: GoalDefinition
  status: GoalStatus
  progress: GoalProgress
  isRewardAvailable: boolean
}
