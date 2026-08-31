import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import StickerReveal from '@/components/StickerReveal.vue'
import type { CardDefinition } from '@/types'

const card: CardDefinition = {
  id: 'irq-14',
  albumId: 'wc-26',
  collectionId: 'wc-26',
  teamId: 'iraq',
  cardNumber: '14',
  albumSlot: 14,
  displayName: 'Youssef Amyn',
  image: '/wc-26/cards/iraq/IRQ-14-youssef-amyn.webp',
  series: 'base',
  finish: 'standard',
  rarity: 'common',
  kind: 'player',
  personId: 'youssef-amyn',
  position: 'MF',
  acquisition: [{ type: 'pack', poolId: 'standard' }],
  selectionWeight: 1,
}

const mountReveal = (advancing: boolean = false) =>
  mount(StickerReveal, {
    props: {
      card,
      index: 0,
      total: 5,
      advancing,
    },
    global: {
      plugins: [i18n],
      stubs: {
        Button: {
          inheritAttrs: false,
          props: ['label', 'disabled'],
          emits: ['click'],
          template:
            '<button type="button" :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
        },
        LoadableImage: {
          template: '<div data-pending-image />',
        },
      },
    },
  })

describe('StickerReveal', () => {
  it('allows the next card when the current image never finishes loading', async () => {
    const wrapper = mountReveal()

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('[data-pending-image]').exists()).toBe(true)

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('next')).toEqual([[]])
  })

  it('still blocks repeated transitions while the store is advancing', async () => {
    const wrapper = mountReveal(true)

    await wrapper.get('[role="button"]').trigger('click')
    await wrapper.get('[role="button"]').trigger('click')

    expect(wrapper.emitted('next')).toBeUndefined()
  })
})
