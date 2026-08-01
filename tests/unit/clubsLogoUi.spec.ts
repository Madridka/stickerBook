import { mount, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import AlbumEditorialPage from '@/components/Album/AlbumEditorialPage.vue'
import StickerSlot from '@/components/Album/StickerSlot.vue'
import album from '@/data/clubsLogo/album'
import cards from '@/data/clubsLogo/catalog'
import { requireAlbum } from '@/data/albumRegistry'
import router from '@/router'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: (key: string): string => key }),
  }
})

vi.mock('@/stores/album', () => ({
  useAlbumStore: () => ({
    geometry: { getSlotStyle: (): Record<string, string> => ({}) },
  }),
}))

describe('clubsLogo journal UI', () => {
  it('exposes the hidden journal through its direct development route', () => {
    const route = router.resolve('/clubsLogo')
    expect(route.name).toBe('clubs-logo-development')
    expect(route.meta.developmentAlbumId).toBe('clubsLogo')
  })

  it('rejects the hidden journal through the player album route', async () => {
    await router.push('/album/clubsLogo')
    expect(router.currentRoute.value.name).toBe('album')
    expect(router.currentRoute.value.path).toBe('/album')
  })

  it('shows page navigation for the expanded journal', async () => {
    const pages = album.pages.map((page) => ({
      id: page.id,
      title: page.id,
      image: '',
    }))
    const wrapper = shallowMount(AlbumBook, {
      props: {
        pages,
        currentPage: 0,
        isOpen: true,
        displayMode: 'spread',
        openStartPage: 1,
      },
    })

    expect(wrapper.find('[aria-label="album.next"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="album.previous"]').exists()).toBe(false)

    await wrapper.setProps({ currentPage: 1 })
    expect(wrapper.find('[aria-label="album.next"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="album.previous"]').exists()).toBe(true)
  })

  it('opens the selected division from the editorial contents', async () => {
    const definition = requireAlbum('clubsLogo').editorialPages.find(
      ({ pageId }) => pageId === 'clubs-logo-contents',
    )
    expect(definition).toBeDefined()
    if (!definition) return

    const wrapper = mount(AlbumEditorialPage, {
      props: { definition, pageNumber: 3 },
    })
    const links = wrapper.findAll('button')
    expect(links).toHaveLength(27)
    await links[26].trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([[58]])
  })

  it('replaces a missing draft image with the named logo slot', async () => {
    const draftCard = cards.find(({ leagueId }) => leagueId === 'esp2')
    expect(draftCard).toBeDefined()
    if (!draftCard) return

    const page = album.pages.find(({ slots }) =>
      slots.some(({ playerId }) => playerId === draftCard.id),
    )
    const slot = page?.slots.find(({ playerId }) => playerId === draftCard.id)
    expect(page).toBeDefined()
    expect(slot).toBeDefined()
    if (!page || !slot) return

    const wrapper = mount(StickerSlot, {
      props: {
        page,
        slot,
        targetCard: draftCard,
        card: draftCard,
        instance: {
          id: `catalog:${draftCard.id}`,
          albumId: 'clubsLogo',
          playerId: draftCard.id,
          quality: 100,
          location: 'album',
        },
      },
    })

    expect(wrapper.find('img').exists()).toBe(true)
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain(draftCard.displayName)
    expect(wrapper.attributes('data-occupied')).toBe('false')
  })
})
