import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import ShopItem from '@/components/Shop/ShopItem.vue'

describe('ShopItem', () => {
  it('показывает иконку у случайного Mixed-пика', () => {
    const wrapper = mount(ShopItem, {
      props: {
        initialSection: 'picks',
        blisters: [],
        playerCoins: 0,
        purchasingById: {},
        cooldownRemainingById: {},
        blistersLoaded: true,
        cooldownRemainingMs: 0,
        miniGameLoaded: true,
        ownedPackIds: [],
        ownedPackDetails: {},
        inventoryLoaded: true,
        pickOffers: [
          {
            id: 'random',
            kind: 'random',
            tier: 'standard',
            cost: 1,
            titleKey: 'shop.picks.random.title',
            descriptionKey: 'shop.picks.random.description',
            priority: 1,
            guaranteedNew: false,
          },
        ],
        pickTokens: 1,
        pickMissingCounts: {},
        picksLoaded: true,
        pickProcessing: false,
      },
      global: {
        plugins: [i18n],
        stubs: {
          Button: true,
          BlisterShopCard: true,
          SelectButton: true,
        },
      },
    })

    expect(wrapper.find('.pi-directions-alt').exists()).toBe(true)
    expect(wrapper.find('.pi-shuffle').exists()).toBe(false)
  })
})
