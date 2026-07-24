import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const testState = vi.hoisted(() => ({
  push: vi.fn(),
  player: {
    coins: 0,
    energy: 100,
    energyLimit: 100,
    availableEnergy: 100,
    energyPercent: 100,
    millisecondsUntilNextEnergy: 0,
    millisecondsUntilFullEnergy: 0,
    canClick: true,
    formattedCoins: '0',
    isLoaded: true,
    addCoin: vi.fn(() => true),
    refreshEnergy: vi.fn(),
  },
  inventory: { packCount: 0 },
  collection: {
    albumProgress: 0,
    collectedTotal: 0,
    total: 960,
    isLoaded: true,
  },
  recommendation: {
    id: 'earn-coins',
    titleKey: 'home.actions.earn.title',
    descriptionKey: 'home.actions.earn.description',
    priority: 300,
    action: {
      labelKey: 'home.actions.earn.action',
      route: { name: 'home', hash: '#clicker' },
    },
  },
  quickActions: [] as Array<Record<string, unknown>>,
  goals: {
    nearestGoals: [] as Array<Record<string, unknown>>,
    rewardGoals: [],
    isLoaded: true,
    lastCompletedGoalId: undefined,
  },
}))

vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>()
  return { ...original, useRouter: () => ({ push: testState.push }) }
})
vi.mock('@/stores/player', () => ({ usePlayerStore: () => testState.player }))
vi.mock('@/stores/inventory', () => ({ useInventoryStore: () => testState.inventory }))
vi.mock('@/stores/collection', () => ({ useCollectionStore: () => testState.collection }))
vi.mock('@/stores/goals', () => ({ useGoalsStore: () => testState.goals }))
vi.mock('@/composables/useRecommendedAction', async () => {
  const { computed } = await import('vue')
  return {
    useRecommendedAction: () => ({
      recommendation: computed(() => testState.recommendation),
      quickActions: computed(() => testState.quickActions),
    }),
  }
})

import HomeView from '@/views/HomeView.vue'

const mountHome = () =>
  mount(HomeView, {
    global: {
      plugins: [i18n],
      stubs: {
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}<slot /></button>',
        },
        ProgressBar: true,
        ClickArea: true,
        ClickEnergyPanel: true,
      },
    },
  })

describe('HomeView', () => {
  beforeEach(() => {
    testState.push.mockClear()
    testState.player.canClick = true
    testState.player.availableEnergy = 100
    testState.player.millisecondsUntilNextEnergy = 0
    testState.player.millisecondsUntilFullEnergy = 0
    testState.quickActions = []
    testState.goals.nearestGoals = []
  })

  it('показывает текущую цель и корректный текст кнопки', () => {
    const wrapper = mountHome()
    expect(wrapper.get('[data-current-goal]').text()).toContain('Заработай монеты')
    expect(wrapper.get('[data-goal-action]').text()).toContain('Перейти к кликеру')
  })

  it('переходит по маршруту основной кнопки', async () => {
    const wrapper = mountHome()
    await wrapper.get('[data-goal-action]').trigger('click')
    expect(testState.push).toHaveBeenCalledWith({ name: 'home', hash: '#clicker' })
  })

  it('показывает оба таймера при нулевой энергии', () => {
    testState.player.canClick = false
    testState.player.availableEnergy = 0
    testState.player.millisecondsUntilNextEnergy = 90_000
    testState.player.millisecondsUntilFullEnergy = 3_600_000
    const wrapper = mountHome()
    expect(wrapper.get('[data-zero-energy]').text()).toContain('00:01:30')
    expect(wrapper.get('[data-zero-energy]').text()).toContain('01:00:00')
  })

  it('не выводит недоступные быстрые действия', () => {
    const wrapper = mountHome()
    expect(wrapper.find('[data-quick-action]').exists()).toBe(false)
  })

  it('показывает компактный блок ближайших целей', () => {
    testState.goals.nearestGoals = [
      {
        definition: { id: 'near', title: 'Открыть 5 наборов' },
        progress: { current: 3, target: 5 },
        status: 'active',
        isRewardAvailable: false,
      },
    ]
    const wrapper = mountHome()
    expect(wrapper.get('[data-nearest-goals]').text()).toContain('3 / 5')
  })

  it('защищает мобильную структуру от горизонтального overflow', () => {
    const wrapper = mountHome()
    expect(wrapper.get('[data-home-view]').classes()).toContain('overflow-x-hidden')
    expect(wrapper.get('[data-current-goal]').element.compareDocumentPosition(
      wrapper.get('[data-clicker]').element,
    ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
