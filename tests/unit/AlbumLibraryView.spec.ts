import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import AlbumLibraryView from '@/views/AlbumLibraryView.vue'

vi.mock('@/stores/collection', () => ({
  useCollectionStore: () => ({ items: [] }),
}))

const mountLibrary = () =>
  mount(AlbumLibraryView, {
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :data-to="to"><slot /></a>',
        },
      },
    },
  })

describe('AlbumLibraryView', () => {
  it('показывает оба журнала и независимый прогресс исторического издания', () => {
    const wrapper = mountLibrary()
    const text = wrapper.text()

    expect(text).toContain('Чемпионат мира 2026')
    expect(text).toContain('История томского футбола XXI века')
    expect(text).toContain('24 из 24 карточек доступны')
    expect(text).toContain('4 из 4 эпох открыты')
    expect(wrapper.findAll('a')).toHaveLength(2)
  })
})
