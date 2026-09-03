import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const testState = vi.hoisted(() => ({
  route: { params: {} as Record<string, string> },
  auth: {
    user: undefined as { id: string; username: string } | undefined,
    isGuest: true,
    isSubmitting: false,
    logout: vi.fn(),
  },
  collection: {
    items: [
      {
        instance: {
          id: 'card-1',
          albumId: 'wc-26',
          playerId: 'player-1',
          location: 'collection',
        },
      },
    ],
    duplicateTotal: 2,
    load: vi.fn(),
    getAlbumProgress: vi.fn(() => ({ collectedCards: 1, placedCards: 0 })),
    getAlbumDuplicates: vi.fn(() => [{ id: 'duplicate-1' }, { id: 'duplicate-2' }]),
  },
  goals: { goals: [], reload: vi.fn() },
  dailyTasks: { completedCount: 1, load: vi.fn() },
  getLeaderboardProfile: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>()
  return {
    ...original,
    useRoute: () => testState.route,
  }
})
vi.mock('@/data/albumRegistry', () => ({
  getPlayerAlbums: () => [{ id: 'wc-26', cards: [{}] }],
}))
vi.mock('@/services/cloudSave', async () => {
  const { ref } = await import('vue')
  return { cloudSyncStatus: ref('idle') }
})
vi.mock('@/services/leaderboard', () => ({
  getLeaderboardProfile: testState.getLeaderboardProfile,
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => testState.auth }))
vi.mock('@/stores/collection', () => ({ useCollectionStore: () => testState.collection }))
vi.mock('@/stores/goals', () => ({ useGoalsStore: () => testState.goals }))
vi.mock('@/stores/dailyTasks', () => ({ useDailyTasksStore: () => testState.dailyTasks }))

import ProfileView from '@/views/ProfileView.vue'

const mountProfile = () =>
  mount(ProfileView, {
    global: {
      plugins: [i18n],
      stubs: {
        AuthView: { template: '<div data-auth-view />' },
        Button: true,
        RouterLink: true,
      },
    },
  })

describe('ProfileView', () => {
  beforeEach(() => {
    testState.route.params = {}
    testState.auth.user = undefined
    testState.auth.isGuest = true
    testState.getLeaderboardProfile.mockReset()
  })

  it('показывает гостю локальную статистику и регистрацию', async () => {
    const wrapper = mountProfile()
    await flushPromises()

    expect(wrapper.get('[data-profile-view]').text()).toContain('Гость')
    expect(wrapper.get('[data-profile-view]').text()).toContain('Всего карточек')
    expect(wrapper.find('[data-auth-view]').exists()).toBe(true)
    expect(testState.getLeaderboardProfile).not.toHaveBeenCalled()
  })

  it('загружает публичный профиль по адресу игрока', async () => {
    testState.route.params = { userId: 'user-1' }
    testState.getLeaderboardProfile.mockResolvedValue({
      player: {
        userId: 'user-1',
        username: 'Игрок рейтинга',
        position: 3,
        totalCards: 120,
        uniqueCards: 100,
        duplicateCards: 20,
        placedCards: 80,
        completedGoals: 4,
        completedDailyTasks: 7,
        createdAt: Date.UTC(2026, 0, 1),
        albumDetails: [],
      },
    })

    const wrapper = mountProfile()
    await flushPromises()

    expect(testState.getLeaderboardProfile).toHaveBeenCalledTimes(1)
    expect(testState.getLeaderboardProfile.mock.calls[0]?.[0]).toBe('user-1')
    expect(testState.getLeaderboardProfile.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal)
    expect(wrapper.get('[data-profile-view]').text()).toContain('Игрок рейтинга')
    expect(wrapper.get('[data-profile-view]').text()).toContain('Место в рейтинге: 3')
    expect(wrapper.find('[data-auth-view]').exists()).toBe(false)
  })
})
