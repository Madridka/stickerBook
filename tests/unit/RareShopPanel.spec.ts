import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const testState = vi.hoisted(() => ({
  push: vi.fn(),
  rareShop: {
    state: {
      currentRotation: {
        id: 'rotation',
        generatedAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      },
      extendedOffer: null,
      lastExtensionDate: null,
      hasSeenRareShopInfo: false,
    },
    currentOffers: [],
    extendedOffer: null,
    extendedOffers: [],
    isLoaded: true,
    pendingOfferId: null,
    load: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    markInfoSeen: vi.fn(async () => {
      testState.rareShop.state.hasSeenRareShopInfo = true
    }),
    extendOffer: vi.fn(),
    purchaseOffer: vi.fn(),
    countryProgress: vi.fn(() => ({ ownedCards: 0, totalCards: 20 })),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: testState.push }),
}))
vi.mock('@/stores/player', () => ({
  usePlayerStore: () => ({
    coins: 100,
    flushSaves: vi.fn(),
    applyPersistedState: vi.fn(),
  }),
}))
vi.mock('@/stores/inventory', () => ({
  useInventoryStore: () => ({ applyPersistedItem: vi.fn() }),
}))
vi.mock('@/stores/rareShop', () => ({
  useRareShopStore: () => testState.rareShop,
}))

import RareShopPanel from '@/components/Shop/RareShopPanel.vue'

const mountPanel = () =>
  mount(RareShopPanel, {
    global: {
      plugins: [i18n],
      stubs: {
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: ['visible'],
          template:
            '<section v-if="visible" data-rare-info><slot /><slot name="footer" /></section>',
        },
        ProgressBar: true,
      },
    },
  })

describe('RareShopPanel info dialog', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    testState.rareShop.state.hasSeenRareShopInfo = false
    testState.rareShop.markInfoSeen.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('показывает справку при первом посещении и сохраняет закрытие', async () => {
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-rare-info]').exists()).toBe(true)
    const confirm = wrapper
      .findAll('button')
      .find((button): boolean => button.text().includes('Понятно'))
    if (!confirm) throw new Error('Confirm button is missing')
    await confirm.trigger('click')
    await flushPromises()

    expect(testState.rareShop.markInfoSeen).toHaveBeenCalledOnce()
    expect(wrapper.find('[data-rare-info]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('не открывает просмотренную справку автоматически, но открывает её вручную', async () => {
    testState.rareShop.state.hasSeenRareShopInfo = true
    const wrapper = mountPanel()
    await flushPromises()

    expect(wrapper.find('[data-rare-info]').exists()).toBe(false)
    const infoButton = wrapper
      .findAll('button')
      .find((button): boolean => button.text().includes('Как это работает'))
    if (!infoButton) throw new Error('Info button is missing')
    await infoButton.trigger('click')

    expect(wrapper.find('[data-rare-info]').exists()).toBe(true)
    wrapper.unmount()
  })
})
