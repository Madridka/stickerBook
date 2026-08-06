import type { AlbumId } from '@/types'
import type { RouteLocationRaw } from 'vue-router'

export type DailyTaskStatus = 'in-progress' | 'completed' | 'reward-claimed'

export type DailyTaskEventType =
  | 'logo-clicked'
  | 'coins-earned'
  | 'energy-restored'
  | 'coins-spent'
  | 'packs-purchased'
  | 'packs-opened'
  | 'cards-received'
  | 'cards-placed'

export type DailyTaskGroup = 'activity' | 'economy' | 'collection'

export type DailyTaskId =
  | 'logo-clicks-30'
  | 'logo-clicks-50'
  | 'earn-coins-35'
  | 'restore-energy-15'
  | 'spend-coins-20'
  | 'spend-coins-40'
  | 'purchase-pack-1'
  | 'open-pack-1'
  | 'open-packs-2'
  | 'receive-cards-5'
  | 'receive-cards-10'
  | 'place-cards-2'
  | 'place-cards-4'

export interface DailyTaskDefinition {
  id: DailyTaskId
  group: DailyTaskGroup
  event: DailyTaskEventType
  target: number
  titleKey: string
  icon: string
  route: RouteLocationRaw
}

export interface DailyTaskProgress {
  taskId: DailyTaskId
  progress: number
  status: DailyTaskStatus
}

export interface PendingDailyCardChoice {
  albumId: AlbumId
  candidateCardIds: string[]
  createdAt: number
}

export interface DailyTasksState {
  id: 'current'
  dayKey: string
  tasks: DailyTaskProgress[]
  rewardClaimed: boolean
  pendingReward?: PendingDailyCardChoice
  // Поле читается только для совместимости с первой версией сохранений.
  pendingRewards?: Partial<Record<DailyTaskId, PendingDailyCardChoice>>
  updatedAt: number
}

export interface DailyTaskEvent {
  type: DailyTaskEventType
  amount: number
}

export interface DailyTaskRuntimeState extends DailyTaskProgress {
  definition: DailyTaskDefinition
  percent: number
}
