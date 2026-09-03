import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const testState = vi.hoisted(() => ({
  collection: {
    duplicateTotal: 0,
    duplicates: [],
    load: vi.fn(),
  },
  pickShop: {
    tokens: 0,
    isProcessing: false,
    load: vi.fn(),
    convertDuplicates: vi.fn(),
    openMixedPickWithDuplicates: vi.fn(),
  },
  push: vi.fn(),
}))

vi.mock('@/stores/collection', () => ({
  useCollectionStore: () => testState.collection,
}))
vi.mock('@/stores/pickShop', () => ({
  usePickShopStore: () => testState.pickShop,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: testState.push }),
}))

import DuplicateRecyclePanel from '@/components/Collection/DuplicateRecyclePanel.vue'

const mountPanel = () =>
  mount(DuplicateRecyclePanel, {
    global: {
      plugins: [i18n],
      stubs: {
        Button: true,
        LoadableImage: true,
        SelectButton: true,
        Select: {
          props: ['modelValue', 'options', 'disabled'],
          template: `
            <div data-amount-select :data-disabled="disabled">
              <span v-for="option in options" :key="option.value">{{ option.label }}</span>
            </div>
          `,
        },
      },
    },
  })

describe('DuplicateRecyclePanel', () => {
  beforeEach(() => {
    testState.collection.duplicateTotal = 0
    testState.collection.duplicates = []
  })

  it('показывает минимальный вариант обмена вместо пустого списка', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-amount-select]').text()).toContain('5 → 1 жет.')
    expect(wrapper.get('[data-amount-select]').attributes('data-disabled')).toBe('true')
  })

  it('показывает доступные варианты обмена', () => {
    testState.collection.duplicateTotal = 12
    const wrapper = mountPanel()

    expect(wrapper.get('[data-amount-select]').text()).toContain('5 → 1 жет.')
    expect(wrapper.get('[data-amount-select]').text()).toContain('10 → 2 жет.')
    expect(wrapper.get('[data-amount-select]').attributes('data-disabled')).toBe('false')
  })
})
