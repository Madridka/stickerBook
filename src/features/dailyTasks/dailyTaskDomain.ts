import { getLocalDateKey } from '@/utils/dailyDateKey'
import { DAILY_TASK_CONFIG } from '@/data/mainConst'
import {
  DAILY_TASK_GROUPS,
  dailyTaskDefinitionById,
  dailyTaskDefinitions,
} from './dailyTaskDefinitions'
import type {
  DailyTaskDefinition,
  DailyTaskEvent,
  DailyTaskGroup,
  DailyTaskId,
  DailyTaskProgress,
  DailyTasksState,
} from './types'

export type DailyTaskRandomSource = () => number

export const selectDailyTaskIds = (
  randomSource: DailyTaskRandomSource = Math.random,
  previousTaskIds: readonly DailyTaskId[] = [],
): DailyTaskId[] =>
  DAILY_TASK_GROUPS.map((group: DailyTaskGroup): DailyTaskId => {
    const previousEvents = new Set(
      previousTaskIds.flatMap((taskId): string[] => {
        const event = dailyTaskDefinitionById.get(taskId)?.event
        return event ? [event] : []
      }),
    )
    const groupCandidates: DailyTaskDefinition[] = dailyTaskDefinitions.filter(
      (definition): boolean => definition.group === group,
    )
    const freshCandidates: DailyTaskDefinition[] = groupCandidates.filter(
      ({ id, event }): boolean =>
        !previousTaskIds.includes(id) && !previousEvents.has(event),
    )
    const candidates: DailyTaskDefinition[] = freshCandidates.length
      ? freshCandidates
      : groupCandidates
    const index: number = Math.min(
      candidates.length - 1,
      Math.floor(Math.max(0, randomSource()) * candidates.length),
    )
    return candidates[index].id
  })

export const createDailyTasksState = (
  now: number,
  randomSource: DailyTaskRandomSource = Math.random,
  previousTaskIds: readonly DailyTaskId[] = [],
): DailyTasksState => ({
  id: 'current',
  dayKey: getLocalDateKey(now),
  tasks: selectDailyTaskIds(randomSource, previousTaskIds).map(
    (taskId: DailyTaskId): DailyTaskProgress => ({
      taskId,
      progress: 0,
      status: 'in-progress',
    }),
  ),
  pendingRewards: {},
  updatedAt: now,
})

export const resolveDailyTasksState = (
  saved: DailyTasksState | undefined,
  now: number,
  randomSource: DailyTaskRandomSource = Math.random,
): DailyTasksState => {
  if (
    !saved ||
    saved.dayKey !== getLocalDateKey(now) ||
    saved.tasks.length !== DAILY_TASK_CONFIG.tasksPerDay
  ) {
    return createDailyTasksState(
      now,
      randomSource,
      saved?.tasks.map(({ taskId }): DailyTaskId => taskId) ?? [],
    )
  }
  const isValid: boolean = saved.tasks.every(({ taskId }): boolean =>
    dailyTaskDefinitionById.has(taskId),
  )
  return isValid ? saved : createDailyTasksState(now, randomSource)
}

export const applyDailyTaskEvents = (
  state: DailyTasksState,
  events: readonly DailyTaskEvent[],
  now: number,
): DailyTasksState => ({
  ...state,
  tasks: state.tasks.map((task: DailyTaskProgress): DailyTaskProgress => {
    if (task.status === 'reward-claimed') return task
    const definition: DailyTaskDefinition | undefined = dailyTaskDefinitionById.get(
      task.taskId,
    )
    if (!definition) return task
    const increment: number = events
      .filter(({ type, amount }): boolean => type === definition.event && amount > 0)
      .reduce((total, { amount }): number => total + amount, 0)
    if (increment <= 0) return task
    const progress: number = Math.min(definition.target, task.progress + increment)
    return {
      ...task,
      progress,
      status: progress >= definition.target ? 'completed' : 'in-progress',
    }
  }),
  updatedAt: now,
})
