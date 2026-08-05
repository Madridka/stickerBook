import { describe, expect, it } from 'vitest'
import {
  applyDailyTaskEvents,
  createDailyTasksState,
  resolveDailyTasksState,
  selectDailyTaskIds,
} from '@/features/dailyTasks/dailyTaskDomain'
import { dailyTaskDefinitionById } from '@/features/dailyTasks/dailyTaskDefinitions'
import type { DailyTasksState } from '@/features/dailyTasks/types'

const DAY_ONE = new Date(2026, 7, 5, 12).getTime()
const DAY_TWO = new Date(2026, 7, 6, 12).getTime()

const createState = (): DailyTasksState => ({
  id: 'current',
  dayKey: '2026-08-05',
  tasks: [
    { taskId: 'restore-energy-15', progress: 0, status: 'in-progress' },
    { taskId: 'spend-coins-20', progress: 0, status: 'in-progress' },
    { taskId: 'place-cards-2', progress: 0, status: 'in-progress' },
  ],
  rewardClaimed: false,
  updatedAt: DAY_ONE,
})

describe('daily task domain', () => {
  it('selects one task from every group without repeating an event type', () => {
    const taskIds = selectDailyTaskIds(() => 0)
    const definitions = taskIds.map((taskId) => dailyTaskDefinitionById.get(taskId))

    expect(definitions.map((definition) => definition?.group)).toEqual([
      'activity',
      'economy',
      'collection',
    ])
    expect(new Set(definitions.map((definition) => definition?.event)).size).toBe(3)
  })

  it('counts only the matching real event amount and caps visible progress', () => {
    const next = applyDailyTaskEvents(
      createState(),
      [
        { type: 'energy-restored', amount: 10 },
        { type: 'coins-earned', amount: 500 },
      ],
      DAY_ONE,
    )
    expect(next.tasks[0]).toMatchObject({ progress: 10, status: 'in-progress' })
    expect(next.tasks[1].progress).toBe(0)

    const completed = applyDailyTaskEvents(
      next,
      [{ type: 'energy-restored', amount: 20 }],
      DAY_ONE,
    )
    expect(completed.tasks[0]).toMatchObject({ progress: 15, status: 'completed' })
  })

  it('does not change a reward that has already been claimed', () => {
    const state = createState()
    state.tasks[2] = { taskId: 'place-cards-2', progress: 2, status: 'reward-claimed' }
    const next = applyDailyTaskEvents(
      state,
      [{ type: 'cards-placed', amount: 1 }],
      DAY_ONE,
    )
    expect(next.tasks[2]).toEqual(state.tasks[2])
  })

  it('keeps same-day progress and clears it together with pending rewards next day', () => {
    const state = createState()
    state.tasks[0].progress = 7
    state.pendingReward = {
      albumId: 'wc-26',
      candidateCardIds: ['a', 'b', 'c'],
      createdAt: DAY_ONE,
    }

    expect(resolveDailyTasksState(state, DAY_ONE)).toBe(state)
    const reset = resolveDailyTasksState(state, DAY_TWO, () => 0)
    expect(reset.dayKey).toBe('2026-08-06')
    expect(reset.tasks.every(({ progress }) => progress === 0)).toBe(true)
    expect(reset.pendingReward).toBeUndefined()
    expect(reset.rewardClaimed).toBe(false)
    expect(reset.tasks.map(({ taskId }) => taskId)).not.toEqual(
      state.tasks.map(({ taskId }) => taskId),
    )
    const previousEvents = state.tasks.map(
      ({ taskId }) => dailyTaskDefinitionById.get(taskId)?.event,
    )
    expect(
      reset.tasks.some(({ taskId }) =>
        previousEvents.includes(dailyTaskDefinitionById.get(taskId)?.event),
      ),
    ).toBe(false)
  })

  it('creates exactly three tasks for an old save without daily state', () => {
    const state = createDailyTasksState(DAY_ONE, () => 0.5)
    expect(state.tasks).toHaveLength(3)
    expect(state.tasks.every(({ status }) => status === 'in-progress')).toBe(true)
  })

  it('считает уже полученную награду старой версии единственным дневным пиком', () => {
    const legacy = createState()
    legacy.tasks[0] = {
      taskId: 'restore-energy-15',
      progress: 15,
      status: 'reward-claimed',
    }
    legacy.pendingRewards = {
      'spend-coins-20': {
        albumId: 'wc-26',
        candidateCardIds: ['a', 'b', 'c'],
        createdAt: DAY_ONE,
      },
    }
    delete (legacy as Partial<DailyTasksState>).rewardClaimed

    const normalized = resolveDailyTasksState(legacy, DAY_ONE)
    expect(normalized.rewardClaimed).toBe(true)
    expect(normalized.tasks[0].status).toBe('completed')
    expect(normalized.pendingReward).toBeUndefined()
    expect(normalized.pendingRewards).toBeUndefined()
  })
})
