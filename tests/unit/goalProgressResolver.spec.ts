import { describe, expect, it } from 'vitest'
import {
  resolveGoalRuntimeState,
  resolveRequirementProgress,
} from '@/features/goals/goalProgressResolver'
import type {
  GoalDefinition,
  GoalProgressContext,
  GoalRequirement,
} from '@/features/goals/types'

const context: GoalProgressContext = {
  counters: {
    'coins-earned': 120,
    'packs-purchased': 2,
    'packs-opened': 7,
    'minigames-completed': 3,
    'duplicates-exchanged': 1,
  },
  uniqueCardsCollected: 27,
  stickersPrepared: 4,
  stickersPlaced: 12,
  albumSlotsFilled: { album: 12 },
  albumProgress: { album: 18 },
  albumPagesFilled: { album: { page: 10 } },
  rarityCollected: { rare: 2 },
  variantsCollected: 1,
}

const requirements: Array<Exclude<GoalRequirement, { type: 'goal-completed' }>> = [
  { type: 'coins-earned', target: 100 },
  { type: 'packs-purchased', target: 1 },
  { type: 'packs-opened', target: 5 },
  { type: 'unique-cards-collected', target: 25 },
  { type: 'stickers-prepared', target: 1 },
  { type: 'stickers-placed', target: 10 },
  { type: 'album-slots-filled', albumId: 'album', target: 10 },
  { type: 'album-progress', albumId: 'album', targetPercent: 10 },
  { type: 'album-page-filled', albumId: 'album', pageId: 'page', target: 10 },
  { type: 'minigames-completed', target: 1 },
  { type: 'duplicates-exchanged', target: 1 },
  { type: 'rarity-collected', rarity: 'rare', target: 1 },
  { type: 'variant-collected', target: 1 },
]

describe('goalProgressResolver', () => {
  it.each(requirements)('вычисляет и ограничивает прогресс $type', (requirement) => {
    const progress = resolveRequirementProgress(requirement, context)
    expect(progress.current).toBe(progress.target)
  })

  it('блокирует последовательную цель до завершения предыдущей', () => {
    const definition: GoalDefinition = {
      id: 'next',
      category: 'packs',
      title: 'Next',
      description: 'Next',
      order: 2,
      requirements: [
        { type: 'goal-completed', goalId: 'previous' },
        { type: 'packs-opened', target: 5 },
      ],
      reward: [{ type: 'coins', amount: 1 }],
    }
    expect(resolveGoalRuntimeState(definition, context, new Map()).status).toBe('locked')
  })

  it('переводит выполненную цель в completed, а полученную в claimed', () => {
    const definition: GoalDefinition = {
      id: 'goal',
      category: 'packs',
      title: 'Goal',
      description: 'Goal',
      order: 1,
      requirements: [{ type: 'packs-opened', target: 5 }],
      reward: [{ type: 'coins', amount: 1 }],
    }
    expect(resolveGoalRuntimeState(definition, context, new Map()).status).toBe('completed')
    expect(
      resolveGoalRuntimeState(
        definition,
        context,
        new Map([['goal', { goalId: 'goal', completedAt: 1, claimedAt: 2 }]]),
      ).status,
    ).toBe('claimed')
  })

  it('автоматически завершает вычисляемую цель старого пользователя', () => {
    const definition: GoalDefinition = {
      id: 'legacy-collection',
      category: 'collection',
      title: 'Legacy',
      description: 'Legacy',
      order: 1,
      requirements: [{ type: 'unique-cards-collected', target: 10 }],
      reward: [{ type: 'coins', amount: 1 }],
    }
    expect(resolveGoalRuntimeState(definition, context, new Map()).status).toBe('completed')
  })

  it('использует восстановленный накопительный счётчик после перезагрузки', () => {
    const restoredContext: GoalProgressContext = {
      ...context,
      counters: JSON.parse(JSON.stringify(context.counters)) as GoalProgressContext['counters'],
    }
    expect(
      resolveRequirementProgress(
        { type: 'minigames-completed', target: 5 },
        restoredContext,
      ),
    ).toEqual({ current: 3, target: 5 })
  })
})
