import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import i18n from '@/plugins/usei18n/usei18n'

const exportedJson: string = JSON.stringify({ schemaVersion: 1, tables: [] }, null, 2)

vi.mock('@/services/cloudSave', () => ({
  exportLocalSaveJson: vi.fn(async (): Promise<string> => exportedJson),
  cloudSave: { importLocalSaveJson: vi.fn() },
}))

import ProgressExportView from '@/components/ProgressExportView.vue'

describe('ProgressExportView', () => {
  it('показывает JSON прогресса и только действия экспорта', async () => {
    const wrapper = mount(ProgressExportView, {
      global: {
        plugins: [i18n],
        stubs: {
          Button: {
            props: ['label'],
            emits: ['click'],
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
          },
          Message: { template: '<div><slot /></div>' },
          Textarea: {
            props: ['modelValue'],
            template: '<textarea data-export-json :value="modelValue" />',
          },
        },
      },
    })

    await flushPromises()

    expect(wrapper.get('[data-save-transfer]').text()).toContain('Ваш прогресс в формате JSON')
    expect((wrapper.get('[data-export-json]').element as HTMLTextAreaElement).value).toBe(
      exportedJson,
    )
    expect(wrapper.text()).toContain('Копировать')
    expect(wrapper.text()).toContain('Скачать файл')
    expect(wrapper.text()).not.toContain('Импортировать')
    expect(wrapper.text()).not.toContain('Выбрать файл')
  })
})
