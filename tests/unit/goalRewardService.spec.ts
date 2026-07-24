import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GoalDefinition, GoalPlayerState, GoalReward } from '@/features/goals/types'

const state = vi.hoisted(() => ({
  goalStates: new Map<string, GoalPlayerState>(),
  player: new Map<string, { id: string; coins: number; energy: number; energyUpdatedAt: number }>(),
  inventory: [] as Array<{
    id: string
    type: 'pack'
    packId?: string
    createdAt: number
  }>,
  nextId: 0,
}))

vi.mock('@/db/database', () => ({
  PLAYER_STATE_ID: 'current',
  database: {
    goalStates: {
      get: vi.fn(async (id: string) => state.goalStates.get(id)),
      put: vi.fn(async (value: GoalPlayerState) => {
        state.goalStates.set(value.goalId, value)
      }),
    },
    player: {
      get: vi.fn(async (id: string) => state.player.get(id)),
      put: vi.fn(
        async (value: {
          id: string
          coins: number
          energy: number
          energyUpdatedAt: number
        }) => {
          state.player.set(value.id, value)
        },
      ),
    },
    inventory: {
      bulkAdd: vi.fn(async (items: typeof state.inventory) => {
        state.inventory.push(...items)
      }),
    },
    transaction: vi.fn(
      async (...args: Array<unknown>) =>
        (args[args.length - 1] as () => Promise<unknown>)(),
    ),
  },
}))
vi.mock('@/utils/createId', () => ({
  createId: () => `reward-pack-${state.nextId++}`,
}))

import { claimGoalReward } from '@/features/goals/goalRewardService'

const definition = (reward: GoalReward[]): GoalDefinition => ({
  id: 'reward-goal',
  category: 'progression',
  title: 'Reward',
  description: 'Reward',
  order: 1,
  requirements: [{ type: 'coins-earned', target: 1 }],
  reward,
})

describe('claimGoalReward', () => {
  beforeEach(() => {
    state.goalStates.clear()
    state.player.clear()
    state.inventory.length = 0
    state.nextId = 0
    state.player.set('current', {
      id: 'current',
      coins: 5,
      energy: 40,
      energyUpdatedAt: 1,
    })
  })

  it('атомарно начисляет монеты, энергию и набор', async () => {
    const result = await claimGoalReward(
      definition([
        { type: 'coins', amount: 10 },
        { type: 'energy', amount: 20 },
        { type: 'pack', packId: 'standard', amount: 1 },
      ]),
      1,
    )

    expect(result.status).toBe('claimed')
    expect(state.player.get('current')).toMatchObject({ coins: 15, energy: 60 })
    expect(state.inventory).toHaveLength(1)
    expect(state.inventory[0]).toMatchObject({ type: 'pack', packId: 'standard' })
    expect(state.goalStates.get('reward-goal')?.claimedAt).toBeTypeOf('number')
  })

  it('не выдаёт сохранённую награду повторно после перезагрузки', async () => {
    const goal = definition([{ type: 'coins', amount: 10 }])
    expect((await claimGoalReward(goal, 1)).status).toBe('claimed')
    expect((await claimGoalReward(goal, 1)).status).toBe('already-claimed')
    expect(state.player.get('current')?.coins).toBe(15)
  })

  it('не выдаёт награду незавершённой цели', async () => {
    expect(
      (await claimGoalReward(definition([{ type: 'coins', amount: 10 }]), undefined))
        .status,
    ).toBe('not-completed')
  })
})
