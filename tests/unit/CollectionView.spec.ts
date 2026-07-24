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
  },
  deletedCards: {
    items: [],
    removeCard: vi.fn(),
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
        Select: true,
        SelectButton: true,
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

  it('открывает карточку в диалоге, а подготовку запускает уже из него', async () => {
    const wrapper = mountCollection()

    await wrapper.get('[data-collection-card]').trigger('click')

    expect(wrapper.find('[data-preview-dialog]').exists()).toBe(true)
    expect(testState.push).not.toHaveBeenCalled()

    await wrapper.get('[data-preview-prepare]').trigger('click')
    await flushPromises()

    expect(testState.gameGuide.consumeAutoPreparation).toHaveBeenCalledOnce()
    expect(testState.push).toHaveBeenCalledWith({
      name: 'album-wc-26',
      query: {
        card: testState.collection.items[0]?.instance.playerId,
        instance: 'instance-1',
        action: 'prepare',
      },
    })
  })
})
