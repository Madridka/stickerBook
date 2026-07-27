import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import StickerPreviewDialog from '@/components/Sticker/StickerPreviewDialog.vue'
import type { CardDefinition, StickerInstance } from '@/types'

const card = {
  id: 'esp-10.1',
  displayName: 'Rodri',
  image: '/cards/spain/ESP-10.1-rodri.webp',
} as CardDefinition

const instance: StickerInstance = {
  id: 'instance-1',
  playerId: card.id,
  quality: 85,
  location: 'collection',
}

const mountDialog = () =>
  mount(StickerPreviewDialog, {
    props: {
      visible: true,
      card,
      instance,
    },
    global: {
      plugins: [i18n],
      stubs: {
        Dialog: {
          props: ['visible'],
          template: '<section v-if="visible"><slot /></section>',
        },
        Button: {
          inheritAttrs: false,
          props: ['label'],
          emits: ['click'],
          template:
            '<button type="button" v-bind="$attrs" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })

describe('StickerPreviewDialog', () => {
  it('показывает стрелки и сохраняет переворот по клику на карточку', async () => {
    const wrapper = mountDialog()
    const flipSurface = wrapper.get('[data-sticker-flip]')

    expect(wrapper.findAll('[data-flip-direction]')).toHaveLength(2)
    expect(flipSurface.classes()).not.toContain('[transform:rotateY(180deg)]')

    await wrapper.get('[data-flip-direction="left"]').trigger('click')
    expect(flipSurface.classes()).toContain('[transform:rotateY(180deg)]')

    await wrapper.get('[data-flip-card]').trigger('click')
    expect(flipSurface.classes()).not.toContain('[transform:rotateY(180deg)]')
  })

  it('компактно объясняет значение качества рядом с процентовкой', () => {
    const text = mountDialog().text()

    expect(text).toContain('Состояние экземпляра')
    expect(text).toContain('ошибках подготовки и вклейки')
    expect(text).toContain('85%')
  })

  it('удаляет карточку только после подтверждения', async () => {
    const wrapper = mountDialog()

    await wrapper.get('[data-delete-card]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()

    await wrapper.get('[data-confirm-delete]').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[instance]])
  })
})
