import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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
        Button: true,
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

  it('объясняет значение качества и влияющие на него действия', () => {
    const text = mountDialog().text()

    expect(text).toContain('Это состояние экземпляра, а не его редкость')
    expect(text).toContain('неточное совмещение')
    expect(text).toContain('ошибки разглаживания')
    expect(text).toContain('слишком далёкая вклейка')
  })
})
