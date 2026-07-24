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
