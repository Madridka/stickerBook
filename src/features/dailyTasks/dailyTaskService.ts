import { database } from '@/db/database'
import { BLISTER_CONFIGS, DAILY_TASK_CONFIG } from '@/config/gameBalance'
import { getPlayerAlbumById } from '@/data/albumRegistry'
import { storeCardInstance } from '@/db/stickerLifecycle'
import { createDuplicateExchangeCandidates } from '@/utils/createDuplicateExchangeCandidates'
import {
  applyDailyTaskEvents,
  resolveDailyTasksState,
} from './dailyTaskDomain'
import type {
  DailyTaskEvent,
  DailyTasksState,
  PendingDailyCardChoice,
} from './types'

export const DAILY_TASKS_CHANGED_EVENT = 'stickerbook:daily-tasks-changed'

export type BeginDailyRewardResult =
  | { status: 'ready'; state: DailyTasksState }
  | { status: 'not-completed'; state: DailyTasksState }

export type ClaimDailyRewardResult =
  | { status: 'claimed'; state: DailyTasksState }
  | { status: 'invalid-choice' | 'already-claimed'; state: DailyTasksState }

export const notifyDailyTasksChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DAILY_TASKS_CHANGED_EVENT))
  }
}

// Вызывается внутри уже открытой Dexie-транзакции игрового действия.
export const recordDailyTaskEventsInTransaction = async (
  events: readonly DailyTaskEvent[],
  now: number = Date.now(),
): Promise<DailyTasksState> => {
  const validEvents: DailyTaskEvent[] = events.filter(
    ({ amount }): boolean => Number.isFinite(amount) && amount > 0,
  )
  const current: DailyTasksState = resolveDailyTasksState(
    await database.dailyTasks.get('current'),
    now,
  )
  const next: DailyTasksState = applyDailyTaskEvents(current, validEvents, now)
  await database.dailyTasks.put(next)
  return next
}

export const ensureDailyTasksState = async (
  now: number = Date.now(),
): Promise<DailyTasksState> =>
  database.transaction(
    'rw',
    database.dailyTasks,
    async (): Promise<DailyTasksState> => {
      const saved: DailyTasksState | undefined = await database.dailyTasks.get('current')
      const current: DailyTasksState = resolveDailyTasksState(saved, now)
      if (current !== saved) await database.dailyTasks.put(current)
      return current
    },
  )

export const beginDailyTaskReward = async (
  now: number = Date.now(),
): Promise<BeginDailyRewardResult> => {
  const result: BeginDailyRewardResult = await database.transaction(
    'rw',
    database.dailyTasks,
    async (): Promise<BeginDailyRewardResult> => {
      const current: DailyTasksState = resolveDailyTasksState(
        await database.dailyTasks.get('current'),
        now,
      )
      const allCompleted: boolean = current.tasks.every(
        ({ status }): boolean => status === 'completed',
      ) && current.tasks.length === DAILY_TASK_CONFIG.tasksPerDay
      if (!allCompleted || current.rewardClaimed) {
        await database.dailyTasks.put(current)
        return { status: 'not-completed', state: current }
      }
      if (current.pendingReward) return { status: 'ready', state: current }

      const album = getPlayerAlbumById(BLISTER_CONFIGS.standard.albumId)
      if (!album) return { status: 'not-completed', state: current }
      const pending: PendingDailyCardChoice = {
        albumId: album.id,
        candidateCardIds: createDuplicateExchangeCandidates(
          album.catalogs,
          new Set<string>(),
          DAILY_TASK_CONFIG.rewardCandidateCount,
        ),
        createdAt: now,
      }
      const next: DailyTasksState = {
        ...current,
        pendingReward: pending,
        updatedAt: now,
      }
      await database.dailyTasks.put(next)
      return { status: 'ready', state: next }
    },
  )
  notifyDailyTasksChanged()
  return result
}

export const claimDailyTaskReward = async (
  cardId: string,
  now: number = Date.now(),
): Promise<ClaimDailyRewardResult> => {
  const result: ClaimDailyRewardResult = await database.transaction(
    'rw',
    [database.dailyTasks, database.cards, database.duplicates],
    async (): Promise<ClaimDailyRewardResult> => {
      const current: DailyTasksState = resolveDailyTasksState(
        await database.dailyTasks.get('current'),
        now,
      )
      if (current.rewardClaimed) {
        return { status: 'already-claimed', state: current }
      }
      const allCompleted: boolean = current.tasks.every(
        ({ status }): boolean => status === 'completed',
      ) && current.tasks.length === DAILY_TASK_CONFIG.tasksPerDay
      const pending: PendingDailyCardChoice | undefined = current.pendingReward
      if (!allCompleted || !pending?.candidateCardIds.includes(cardId)) {
        return { status: 'invalid-choice', state: current }
      }
      await storeCardInstance(pending.albumId, cardId)
      const next: DailyTasksState = {
        ...current,
        rewardClaimed: true,
        pendingReward: undefined,
        updatedAt: now,
      }
      await database.dailyTasks.put(next)
      return { status: 'claimed', state: next }
    },
  )
  notifyDailyTasksChanged()
  return result
}
