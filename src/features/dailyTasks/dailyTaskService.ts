import { database } from '@/db/database'
import { BLISTER_CONFIGS, DAILY_TASK_CONFIG } from '@/data/mainConst'
import { getPlayerAlbumById } from '@/data/albumRegistry'
import { storeCardInstance } from '@/db/stickerLifecycle'
import { createDuplicateExchangeCandidates } from '@/utils/createDuplicateExchangeCandidates'
import {
  applyDailyTaskEvents,
  resolveDailyTasksState,
} from './dailyTaskDomain'
import type {
  DailyTaskEvent,
  DailyTaskId,
  DailyTaskProgress,
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
  taskId: DailyTaskId,
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
      const task: DailyTaskProgress | undefined = current.tasks.find(
        (item): boolean => item.taskId === taskId,
      )
      if (!task || task.status !== 'completed') {
        await database.dailyTasks.put(current)
        return { status: 'not-completed', state: current }
      }
      if (current.pendingRewards[taskId]) return { status: 'ready', state: current }

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
        pendingRewards: { ...current.pendingRewards, [taskId]: pending },
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
  taskId: DailyTaskId,
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
      const task: DailyTaskProgress | undefined = current.tasks.find(
        (item): boolean => item.taskId === taskId,
      )
      if (task?.status === 'reward-claimed') {
        return { status: 'already-claimed', state: current }
      }
      const pending: PendingDailyCardChoice | undefined = current.pendingRewards[taskId]
      if (!task || task.status !== 'completed' || !pending?.candidateCardIds.includes(cardId)) {
        return { status: 'invalid-choice', state: current }
      }
      await storeCardInstance(pending.albumId, cardId)
      const pendingRewards = { ...current.pendingRewards }
      delete pendingRewards[taskId]
      const next: DailyTasksState = {
        ...current,
        tasks: current.tasks.map(
          (item): DailyTaskProgress =>
            item.taskId === taskId ? { ...item, status: 'reward-claimed' } : item,
        ),
        pendingRewards,
        updatedAt: now,
      }
      await database.dailyTasks.put(next)
      return { status: 'claimed', state: next }
    },
  )
  notifyDailyTasksChanged()
  return result
}
