import { mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('switches real tabs and shows collection completion for UCL', async () => {
    const wrapper = mount(AlbumLibraryView, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: RouterLinkStub,
          LoadableImage: true,
        },
      },
    })

    const leaguesTab = wrapper
      .findAll('[role="tab"]')
      .find((tab) => tab.text().includes('Лиги'))

    expect(leaguesTab).toBeDefined()
    expect(wrapper.findAllComponents(RouterLinkStub).some((link) => link.props('to') === '/album/ucl-26-27')).toBe(false)
    await leaguesTab?.trigger('click')
    expect(leaguesTab?.attributes('aria-selected')).toBe('true')

    const uclAlbum = wrapper
      .findAllComponents(RouterLinkStub)
      .find((link) => link.props('to') === '/album/ucl-26-27')

    expect(uclAlbum).toBeDefined()
    expect(uclAlbum?.text()).toContain('Заполнено: 6%')
    expect(uclAlbum?.text()).toContain('Собрано 43 из 720')
    expect(uclAlbum?.find('[style="width: 6%;"]').exists()).toBe(true)

    wrapper.unmount()
    const reopened = mount(AlbumLibraryView, {
      global: {
        plugins: [i18n],
        stubs: { RouterLink: RouterLinkStub, LoadableImage: true },
      },
    })
    expect(
      reopened.findAll('[role="tab"]').find((tab) => tab.text().includes('Лиги'))
        ?.attributes('aria-selected'),
    ).toBe('true')
    expect(
      reopened.findAllComponents(RouterLinkStub).some((link) => link.props('to') === '/album/tomsk'),
    ).toBe(true)
  })
})
