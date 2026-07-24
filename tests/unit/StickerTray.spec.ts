import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import StickerTray from '@/components/Sticker/StickerTray.vue'
import type { StickerTrayItem } from '@/types'

const createItem = (prepared: boolean): StickerTrayItem =>
  ({
    card: {
      id: 'mex-01',
      displayName: 'Mexico',
    },
    instance: {
      id: 'instance-1',
      playerId: 'mex-01',
      quality: 100,
      location: 'inventory',
      preparation: prepared
        ? { quality: 100, alignmentX: 0, alignmentY: 0 }
        : undefined,
    },
  }) as StickerTrayItem

const mountTray = (item: StickerTrayItem) =>
  mount(StickerTray, {
    props: {
      cards: [item],
      autoPrepareInstanceId: item.instance.id,
    },
    global: {
      plugins: [i18n],
      stubs: {
        StickerDraggable: true,
        StickerPreviewDialog: true,
        StickerPeelGame: {
          props: ['visible', 'item'],
          template:
            '<div v-if="visible" data-auto-preparation>{{ item?.instance?.id }}</div>',
        },
      },
    },
  })

describe('StickerTray onboarding', () => {
  it('автоматически запускает подготовку выбранной неподготовленной карточки', async () => {
    const wrapper = mountTray(createItem(false))
    await nextTick()
    await nextTick()
    expect(wrapper.get('[data-auto-preparation]').text()).toBe('instance-1')
  })

  it('не запускает подготовку повторно для уже готовой карточки', async () => {
    const wrapper = mountTray(createItem(true))
    await nextTick()
    expect(wrapper.find('[data-auto-preparation]').exists()).toBe(false)
  })
})
