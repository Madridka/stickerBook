import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const testState = vi.hoisted(() => ({
  push: vi.fn(),
  collection: {
    items: [] as Array<{
      instance: {
        id: string
        playerId: string
        albumId: 'wc-26'
        quality: number
        location: 'collection'
      }
      duplicateCount: number
    }>,
    isLoaded: true,
    collectedTotal: 1,
    duplicateTotal: 0,
    total: 1,
    load: vi.fn(),
    getAlbumProgress: vi.fn(() => ({
      albumId: 'wc-26',
      totalCards: 1,
      collectedCards: 1,
      placedCards: 0,
      duplicateCards: 0,
    })),
  },
  deletedCards: {
    items: [],
    removeCard: vi.fn(),
    restoreCard: vi.fn(),
  },
  gameGuide: {
    currentStep: undefined,
    consumeAutoPreparation: vi.fn(),
    markCollectionViewed: vi.fn(),
  },
}))

vi.mock('vue-router', async (importOriginal) => {
  const original = await importOriginal<typeof import('vue-router')>()
  return {
    ...original,
    useRoute: () => ({ query: {} }),
    useRouter: () => ({ push: testState.push }),
  }
})
vi.mock('@/stores/collection', () => ({
  useCollectionStore: () => testState.collection,
}))
vi.mock('@/stores/deletedCards', () => ({
  useDeletedCardsStore: () => testState.deletedCards,
}))
vi.mock('@/stores/gameGuide', () => ({
  useGameGuideStore: () => testState.gameGuide,
}))

import cards from '@/data/wc-26/catalog'
import CollectionView from '@/views/CollectionView.vue'

const slotStub = { template: '<div><slot /></div>' }
const mountCollection = () =>
  mount(CollectionView, {
    global: {
      plugins: [i18n],
      stubs: {
        Tabs: slotStub,
        TabList: slotStub,
        Tab: slotStub,
        TabPanels: slotStub,
        TabPanel: slotStub,
        Select: {
          props: ['modelValue', 'options'],
          template: `
            <div data-album-select>
              <span
                v-for="option in options"
                :key="option.value"
                :data-album-id="option.value"
              >{{ option.label }}</span>
            </div>
          `,
        },
        CollectionControls: true,
        DuplicateExchangePanel: true,
        StickerPreviewDialog: {
          props: ['visible', 'card', 'instance'],
          emits: ['update:visible', 'prepare', 'remove'],
          template: `
            <div v-if="visible" data-preview-dialog>
              <button type="button" data-preview-prepare @click="$emit('prepare', instance)">
                Prepare
              </button>
            </div>
          `,
        },
      },
    },
  })

describe('CollectionView', () => {
  beforeEach(() => {
    const card = cards[0]
    if (!card) throw new Error('Card catalog is empty')
    testState.collection.items = [
      {
        instance: {
          id: 'instance-1',
          playerId: card.id,
          albumId: 'wc-26',
          quality: 100,
          location: 'collection',
        },
        duplicateCount: 0,
      },
    ]
    testState.push.mockReset()
    testState.collection.load.mockReset()
    testState.deletedCards.removeCard.mockReset()
    testState.gameGuide.consumeAutoPreparation.mockReset()
    testState.gameGuide.consumeAutoPreparation.mockResolvedValue(true)
    testState.gameGuide.markCollectionViewed.mockReset()
  })

  it('показывает все доступные журналы в компактном выборе', () => {
    const wrapper = mountCollection()

    expect(wrapper.find('[data-album-id="wc-26"]').exists()).toBe(true)
    expect(wrapper.find('[data-album-id="tomsk"]').exists()).toBe(true)
    expect(wrapper.find('[data-album-id="ucl-26-27"]').exists()).toBe(true)
    expect(wrapper.find('[data-album-id="spainClubsLogo"]').exists()).toBe(true)
    expect(wrapper.find('[data-album-id="russiaClubsLogo"]').exists()).toBe(true)
    expect(wrapper.find('[data-album-id="englandClubsLogo"]').exists()).toBe(true)
  })

  it('не запускает 801 скелетон одновременно для большой коллекции', () => {
    const card = cards[0]
    if (!card) throw new Error('Card catalog is empty')
    const observe = vi.fn()
    const unobserve = vi.fn()
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(() => ({ observe, unobserve, disconnect: vi.fn() })),
    )
    testState.collection.items = Array.from({ length: 801 }, (_, index: number) => ({
      instance: {
        id: `instance-${index}`,
        playerId: card.id,
        albumId: 'wc-26' as const,
        quality: 100,
        location: 'collection' as const,
      },
      duplicateCount: 0,
    }))

    const wrapper = mountCollection()

    expect(wrapper.findAll('[data-collection-card]')).toHaveLength(801)
    expect(wrapper.findAll('[data-image-loader]')).toHaveLength(0)
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(observe).toHaveBeenCalledTimes(801)
    wrapper.unmount()
    expect(unobserve).toHaveBeenCalledTimes(801)
    vi.unstubAllGlobals()
  })

  it('открывает карточку в диалоге, а подготовку запускает уже из него', async () => {
    const wrapper = mountCollection()

    await wrapper.get('[data-collection-card]').trigger('click')

    expect(wrapper.find('[data-preview-dialog]').exists()).toBe(true)
    expect(testState.push).not.toHaveBeenCalled()

    await wrapper.get('[data-preview-prepare]').trigger('click')
    await flushPromises()

    expect(testState.gameGuide.consumeAutoPreparation).toHaveBeenCalledOnce()
    expect(testState.push).toHaveBeenCalledWith({
      name: 'album-detail',
      params: { albumId: 'wc-26' },
      query: {
        card: testState.collection.items[0]?.instance.playerId,
        instance: 'instance-1',
        action: 'prepare',
      },
    })
  })
})
