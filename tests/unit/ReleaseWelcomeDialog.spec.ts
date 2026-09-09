import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'
import packageMetadata from '../../package.json'
import ReleaseWelcomeDialog from '@/components/ReleaseWelcomeDialog.vue'

const storageKey: string = 'sticker-book:last-seen-release'

const mountDialog = () =>
  mount(ReleaseWelcomeDialog, {
    global: {
      plugins: [i18n],
      stubs: {
        Dialog: {
          props: ['visible'],
          template: '<section v-if="visible"><slot /><slot name="footer" /></section>',
        },
        Button: {
          props: ['label'],
          emits: ['click'],
          template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
      },
    },
  })

describe('ReleaseWelcomeDialog', () => {
  beforeEach((): void => {
    window.localStorage.clear()
  })

  it('показывает нововведения при первом старте версии и запоминает закрытие', async () => {
    const wrapper = mountDialog()
    await nextTick()

    expect(wrapper.text()).toContain('+131 карточка ЛЧ')
    expect(wrapper.text()).toContain('+292 эмблемы Англии')

    await wrapper.get('button').trigger('click')

    expect(window.localStorage.getItem(storageKey)).toBe(packageMetadata.version)
    expect(wrapper.text()).toBe('')
  })

  it('не показывается повторно в уже просмотренной версии', () => {
    window.localStorage.setItem(storageKey, packageMetadata.version)

    expect(mountDialog().text()).toBe('')
  })
})
