import { describe, expect, it } from 'vitest'
import {
  resolveRecommendedAction,
  type RecommendedActionSnapshot,
} from '@/composables/useRecommendedAction'

const createSnapshot = (
  overrides: Partial<RecommendedActionSnapshot> = {},
): RecommendedActionSnapshot => ({
  coins: 0,
  energy: 0,
  packCount: 0,
  hasPendingOpening: false,
  cardsToPrepare: 0,
  preparedStickers: 0,
  duplicateCount: 0,
  hasPendingExchange: false,
  canPlayMiniGame: false,
  collectionCount: 0,
  albumCount: 0,
  ...overrides,
})

describe('resolveRecommendedAction', () => {
  it('предлагает магазин при достаточном балансе', () => {
    expect(resolveRecommendedAction(createSnapshot({ coins: 20 })).id).toBe('buy-pack')
  })

  it('предлагает открыть имеющийся пак', () => {
    expect(resolveRecommendedAction(createSnapshot({ coins: 20, packCount: 1 })).id).toBe(
      'open-pack',
    )
  })

  it('предлагает альбом для подготовленной наклейки', () => {
    expect(resolveRecommendedAction(createSnapshot({ preparedStickers: 1 })).id).toBe(
      'place-sticker',
    )
  })

  it('при нулевой энергии ставит открытие пака выше кликера', () => {
    expect(resolveRecommendedAction(createSnapshot({ energy: 0, packCount: 1 })).id).toBe(
      'open-pack',
    )
  })

  it('при нулевой энергии без действий предлагает коллекцию', () => {
    expect(resolveRecommendedAction(createSnapshot()).id).toBe('browse-collection')
  })

  it('не создаёт переход к кликеру для цели на текущем экране', () => {
    const recommendation = resolveRecommendedAction(createSnapshot({ energy: 10 }))
    expect(recommendation.id).toBe('earn-coins')
    expect(recommendation.action).toBeUndefined()
  })

  it('не создаёт якорь для первого шага гайда', () => {
    const recommendation = resolveRecommendedAction(
      createSnapshot({
        energy: 10,
        guideStep: {
          id: 'earn-first-pack',
          titleKey: 'home.guide.earn.title',
          descriptionKey: 'home.guide.earn.description',
        },
      }),
    )
    expect(recommendation.id).toBe('guide-earn-first-pack')
    expect(recommendation.action).toBeUndefined()
  })

  it('показывает доступную мини-игру', () => {
    expect(resolveRecommendedAction(createSnapshot({ canPlayMiniGame: true })).id).toBe(
      'play-mini-game',
    )
  })

  it('выбирает более приоритетное действие из нескольких', () => {
    const result = resolveRecommendedAction(
      createSnapshot({
        coins: 100,
        energy: 50,
        packCount: 2,
        preparedStickers: 1,
        canPlayMiniGame: true,
      }),
    )
    expect(result.id).toBe('place-sticker')
  })
})
