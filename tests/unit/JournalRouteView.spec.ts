import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import JournalRouteView from '@/views/JournalRouteView.vue'

const replace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    meta: {},
    params: { journalId: 'missing-journal' },
  }),
  useRouter: () => ({ replace }),
}))

describe('JournalRouteView', () => {
  it('возвращает пользователя в библиотеку для неизвестного id', () => {
    mount(JournalRouteView)
    expect(replace).toHaveBeenCalledWith({ name: 'album' })
  })
})
