import { mount, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import AlbumEditorialPage from '@/components/Album/AlbumEditorialPage.vue'
import StickerSlot from '@/components/Album/StickerSlot.vue'
import album from '@/data/spainClubsLogo/album'
import cards from '@/data/spainClubsLogo/catalog'
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

describe('spainClubsLogo journal UI', () => {
  it('redirects the short route to the player journal', async () => {
    await router.push('/spainClubsLogo')
    expect(router.currentRoute.value.name).toBe('album-detail')
    expect(router.currentRoute.value.path).toBe('/album/spainClubsLogo')
  })

  it('opens the Spanish club logos journal through the player album route', async () => {
    await router.push('/album/spainClubsLogo')
    expect(router.currentRoute.value.name).toBe('album-detail')
    expect(router.currentRoute.value.path).toBe('/album/spainClubsLogo')
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
    const definition = requireAlbum('spainClubsLogo').editorialPages.find(
      ({ pageId }) => pageId === 'spain-clubs-logo-contents',
    )
    expect(definition).toBeDefined()
    if (!definition) return

    const wrapper = mount(AlbumEditorialPage, {
      props: { definition, pageNumber: 3 },
    })
    const links = wrapper.findAll('button')
    expect(links).toHaveLength(9)
    await links[8].trigger('click')
    expect(wrapper.emitted('navigate')).toEqual([[24]])

    await wrapper.setProps({ pageNumber: 5 })
    const lastPageLinks = wrapper.findAll('button')
    expect(lastPageLinks).toHaveLength(9)
    await lastPageLinks[8].trigger('click')
    expect(wrapper.emitted('navigate')?.at(-1)).toEqual([60])
  })

  it('shows the named slot and allows retrying a missing draft image', async () => {
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
          albumId: 'spainClubsLogo',
          playerId: draftCard.id,
          quality: 100,
          location: 'album',
        },
      },
    })

    expect(wrapper.find('img').exists()).toBe(true)
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.text()).toContain(draftCard.displayName)
    expect(wrapper.attributes('data-occupied')).toBe('false')

    await wrapper.get('[aria-label="common.imageRetry"]').trigger('click')
    await wrapper.get('img').trigger('load')
    expect(wrapper.attributes('data-occupied')).toBe('true')
  })
})
