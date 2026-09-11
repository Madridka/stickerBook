import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PrimeVue from 'primevue/config'
import type { Component } from 'vue'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import PackPenaltyGame from '@/components/MiniGame/PackPenaltyGame.vue'
import PackSortGame from '@/components/MiniGame/PackSortGame.vue'
import PackUnblockGame from '@/components/MiniGame/PackUnblockGame.vue'
import PackOddGame from '@/components/MiniGame/PackOddGame.vue'
import packHunt from '@/lang/ru/packHunt.json'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'
import { createOddCards, createSortingCards, loadMiniGamePlayers } from '@/utils/miniGameCards'
import { appendRecentPackMiniGame, getEnabledPackMiniGameIds, selectPackMiniGame, type PackMiniGameId } from '@/utils/selectPackMiniGame'

const pool = await loadMiniGamePlayers()
const wrappers: VueWrapper[] = []
const render = (component: Component): VueWrapper => {
  const wrapper = mount(component, {
    global: {
      plugins: [PrimeVue, createI18n({ legacy: false, locale: 'ru', messages: { ru: { packHunt } } })],
      stubs: { LoadableImage: { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' } },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}
const click = async (wrapper: VueWrapper, text: string): Promise<void> => {
  const button = wrapper.findAll('button').find((entry) => entry.text() === text)
  expect(button, text).toBeDefined()
  await button!.trigger('click')
}
const loadImages = async (wrapper: VueWrapper): Promise<void> => {
  await flushPromises()
  for (const image of wrapper.findAll('.hidden img')) await image.trigger('load')
  await flushPromises()
}
beforeEach(() => { vi.useFakeTimers(); vi.spyOn(Math, 'random').mockReturnValue(0) })
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); vi.useRealTimers(); vi.restoreAllMocks() })

describe('mini-game pool and real cards', () => {
  it('rotates through twelve games without repeating', () => {
    let history: PackMiniGameId[] = []
    const played = new Set<PackMiniGameId>()
    for (const _id of getEnabledPackMiniGameIds()) {
      const id = selectPackMiniGame(history)
      expect(played.has(id)).toBe(false)
      played.add(id)
      history = appendRecentPackMiniGame(history, id)
    }
    expect(played.size).toBe(12)
  })
  it('uses twelve different real cards covering four rarities with existing images', () => {
    const cards = createSortingCards(pool)
    expect(new Set(cards.map((card) => card.id)).size).toBe(12)
    for (const rarity of PACK_HUNT_CONFIG.sort.categories) expect(cards.filter((card) => card.rarity === rarity)).toHaveLength(3)
    for (const card of cards) expect(existsSync(resolve('public', card.image.replace(/^\//, ''))), card.image).toBe(true)
  })
  it('builds three rounds with exactly three unique players of one club and one outsider', () => {
    const cards = createOddCards(pool)
    expect(cards).toHaveLength(12)
    expect(cards.slice(0, 4).filter((card) => card.teamId === 'real-madrid')).toHaveLength(3)
    expect(cards.slice(0, 4).filter((card) => card.teamId === 'arsenal')).toHaveLength(1)
    for (let index = 0; index < cards.length; index += 4) {
      const round = cards.slice(index, index + 4)
      const clubs = [...new Set(round.map((card) => card.teamId))]
      expect(clubs).toHaveLength(2)
      expect(clubs.map((club) => round.filter((card) => card.teamId === club).length).sort()).toEqual([1, 3])
      expect(new Set(round.map((card) => card.personId)).size).toBe(4)
      for (const card of round) expect(existsSync(resolve('public', card.image.replace(/^\//, ''))), card.image).toBe(true)
    }
  })
})

describe('moving goalkeeper', () => {
  it('moves, responds to keyboard and pointer shots, and finishes the five-shot series once', async () => {
    let now = 0
    let callback: FrameRequestCallback = () => undefined
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((next) => { callback = next; return 1 })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const wrapper = render(PackPenaltyGame)
    const field = wrapper.get('svg[role="application"]')
    const keeper = wrapper.get('[data-testid="keeper"]')
    const firstPosition = keeper.attributes('transform')
    now = 400; callback(now)
    await flushPromises()
    expect(keeper.attributes('transform')).not.toBe(firstPosition)
    expect(wrapper.find('[role="slider"]').exists()).toBe(false)
    await click(wrapper, packHunt.newGames.start)
    vi.spyOn(field.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 360 } as DOMRect)
    for (let index = 0; index < 5; index += 1) {
      if (index === 0) await field.trigger('pointerdown', { clientX: 80, clientY: 80, button: 0, pointerType: 'mouse' })
      else { await field.trigger('keydown', { key: 'ArrowLeft' }); await field.trigger('keydown', { key: 'Enter' }) }
      await field.trigger('keydown', { key: 'Enter' })
      expect(wrapper.text()).toContain(`Удары: ${index + 1}/5`)
      now += PACK_HUNT_CONFIG.penalty.flightMs
      callback(now)
      await vi.advanceTimersByTimeAsync(PACK_HUNT_CONFIG.penalty.resultMs)
    }
    expect(wrapper.emitted('complete')).toBeUndefined()
    await click(wrapper, packHunt.newGames.finish)
    await click(wrapper, packHunt.newGames.finish)
    expect(wrapper.emitted('complete')).toHaveLength(1)
    wrapper.unmount()
    expect(cancel).toHaveBeenCalled()
  })
})

describe('sorting real stickers', () => {
  it('starts only after images load, shows real portraits and scores each card once', async () => {
    const wrapper = render(PackSortGame)
    await flushPromises()
    expect(wrapper.text()).toContain(packHunt.newGames.loading)
    await loadImages(wrapper)
    await click(wrapper, packHunt.newGames.start)
    for (let index = 0; index < PACK_HUNT_CONFIG.sort.cards; index += 1) {
      const image = wrapper.find('img[alt]:not([alt=""])')
      const card = pool.find((entry) => entry.image === image.attributes('src'))!
      expect(card).toBeDefined()
      const label = packHunt.newGames[card.rarity as 'common' | 'rare' | 'epic' | 'legendary']
      await click(wrapper, label)
      await click(wrapper, label)
      await vi.advanceTimersByTimeAsync(PACK_HUNT_CONFIG.sort.feedbackMs)
    }
    expect(wrapper.text()).toContain('12 из 12')
    await click(wrapper, packHunt.newGames.finish)
    expect(wrapper.emitted('complete')).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('recovers from image failures and allows completion after timeouts', async () => {
    const wrapper = render(PackSortGame)
    await flushPromises()
    await wrapper.get('.hidden img').trigger('error')
    expect(wrapper.text()).toContain(packHunt.newGames.loadError)
    await click(wrapper, packHunt.newGames.retry)
    await loadImages(wrapper)
    await click(wrapper, packHunt.newGames.start)
    await vi.advanceTimersByTimeAsync(70000)
    expect(wrapper.text()).toContain('0 из 12')
    await click(wrapper, packHunt.newGames.finish)
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
  it('does not hang forever on stalled image requests', async () => {
    const wrapper = render(PackSortGame)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(PACK_HUNT_CONFIG.cardLoadTimeoutMs)
    expect(wrapper.text()).toContain(packHunt.newGames.loadError)
    expect(wrapper.findAll('button')).toHaveLength(1)
  })
})

describe('odd club', () => {
  it('uses team membership and allows correcting an answer in each round', async () => {
    const wrapper = render(PackOddGame)
    await loadImages(wrapper)
    for (let round = 0; round < PACK_HUNT_CONFIG.odd.rounds; round += 1) {
      const buttons = wrapper.findAll('button[aria-label]')
      const cards = buttons.map((button) => pool.find((card) => card.image === button.get('img').attributes('src'))!)
      const oddIndex = cards.findIndex((card) => cards.filter((other) => card.teamId === other.teamId).length === 1)
      await buttons[(oddIndex + 1) % 4]!.trigger('click')
      expect(wrapper.text()).toContain(packHunt.odd.retry)
      await buttons[oddIndex]!.trigger('click')
      expect(wrapper.text()).toContain(packHunt.odd.correct)
      await click(wrapper, round === 2 ? packHunt.newGames.finish : packHunt.newGames.next)
    }
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
})

describe('release tangled straps', () => {
  it('rejects a covered strap, animates removal and completes both packs once', async () => {
    const wrapper = render(PackUnblockGame)
    const topSymbol = (): string => wrapper.get('.sr-only').text().replace('Сверху лежит лента ', '').replace('.', '')
    const wrong = PACK_HUNT_CONFIG.unblock.straps.find((strap) => strap.symbol !== topSymbol())!
    await click(wrapper, wrong.symbol)
    expect(wrapper.text()).toContain(packHunt.unblock.blocked)
    for (let round = 0; round < 2; round += 1) {
      for (let index = 0; index < PACK_HUNT_CONFIG.unblock.strapCounts[round]!; index += 1) {
        const symbol = topSymbol()
        await click(wrapper, symbol)
        await click(wrapper, symbol)
        await vi.advanceTimersByTimeAsync(PACK_HUNT_CONFIG.unblock.releaseMs)
      }
      expect(wrapper.text()).toContain(packHunt.unblock.freed)
      await click(wrapper, round === 1 ? packHunt.newGames.finish : packHunt.newGames.next)
    }
    await click(wrapper, packHunt.newGames.finish)
    expect(wrapper.emitted('complete')).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
