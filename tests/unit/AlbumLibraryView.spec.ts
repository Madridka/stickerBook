import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const collection = vi.hoisted(() => ({
  getAlbumProgress: vi.fn((albumId: string) => ({
    albumId,
    totalCards: albumId === 'ucl-26-27' ? 720 : 0,
    collectedCards: albumId === 'ucl-26-27' ? 43 : 0,
    placedCards: 0,
    duplicateCards: 0,
    completionPercent: albumId === 'ucl-26-27' ? 6 : 0,
  })),
}))

vi.mock('@/stores/collection', () => ({
  useCollectionStore: () => collection,
}))

import AlbumLibraryView from '@/views/AlbumLibraryView.vue'

describe('AlbumLibraryView', () => {
  it('shows collection completion for UCL even when its cards are not placed yet', () => {
    const wrapper = mount(AlbumLibraryView, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: RouterLinkStub,
          LoadableImage: true,
        },
      },
    })

    const uclAlbum = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.props('to') === '/album/ucl-26-27')

    expect(uclAlbum).toBeDefined()
    expect(uclAlbum?.text()).toContain('Заполнено: 6%')
    expect(uclAlbum?.text()).toContain('Собрано 43 из 720')
    expect(uclAlbum?.find('[style="width: 6%;"]').exists()).toBe(true)
  })
})
