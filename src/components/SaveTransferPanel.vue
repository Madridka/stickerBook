<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { cloudSave, exportLocalSaveJson } from '@/services/cloudSave'

import Button from 'primevue/button'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'

type TransferNotice = 'copied' | 'exported' | 'file-loaded' | null

const props = withDefaults(defineProps<{ exportOnly?: boolean }>(), {
  exportOnly: false,
})

const { t } = useI18n()
const jsonText: Ref<string> = ref('')
const fileInput: Ref<HTMLInputElement | null> = ref(null)
const isExporting: Ref<boolean> = ref(false)
const isImporting: Ref<boolean> = ref(false)
const notice: Ref<TransferNotice> = ref(null)
const errorMessage: Ref<string> = ref('')

const createExport = async (): Promise<string> => {
  isExporting.value = true
  errorMessage.value = ''
  notice.value = null
  try {
    const value: string = await exportLocalSaveJson()
    jsonText.value = value
    return value
  } catch {
    errorMessage.value = t('home.saveTransfer.errors.export')
    return ''
  } finally {
    isExporting.value = false
  }
}

const copyJson = async (): Promise<void> => {
  const value: string = jsonText.value || (await createExport())
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    notice.value = 'copied'
  } catch {
    const fallback: HTMLTextAreaElement = document.createElement('textarea')
    fallback.value = value
    fallback.style.position = 'fixed'
    fallback.style.opacity = '0'
    document.body.append(fallback)
    fallback.select()
    const copied: boolean =
      typeof document.execCommand === 'function' && document.execCommand('copy')
    fallback.remove()
    if (copied) notice.value = 'copied'
    else errorMessage.value = t('home.saveTransfer.errors.copy')
  }
}

const downloadJson = async (): Promise<void> => {
  const value: string = await createExport()
  if (!value) return
  const url: string = URL.createObjectURL(new Blob([value], { type: 'application/json' }))
  const link: HTMLAnchorElement = document.createElement('a')
  link.href = url
  link.download = `vkleika-save-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
  notice.value = 'exported'
}

const chooseFile = (): void => fileInput.value?.click()

const loadFile = async (event: Event): Promise<void> => {
  const input: HTMLInputElement = event.currentTarget as HTMLInputElement
  const file: File | undefined = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    jsonText.value = await file.text()
    JSON.parse(jsonText.value)
    errorMessage.value = ''
    notice.value = 'file-loaded'
  } catch {
    errorMessage.value = t('home.saveTransfer.errors.invalidJson')
  }
}

const importJson = async (): Promise<void> => {
  if (!jsonText.value.trim()) {
    errorMessage.value = t('home.saveTransfer.errors.empty')
    return
  }
  if (!window.confirm(t('home.saveTransfer.confirm'))) return
  isImporting.value = true
  errorMessage.value = ''
  notice.value = null
  try {
    await cloudSave.importLocalSaveJson(jsonText.value)
    window.location.reload()
  } catch {
    errorMessage.value = t('home.saveTransfer.errors.import')
    isImporting.value = false
  }
}

onMounted((): void => void createExport())
</script>

<template>
  <section
    class="flex h-full min-h-[20rem] flex-col border-2 border-ink bg-paper p-4 shadow-[6px_6px_0_rgb(var(--color-gold)/0.5)] sm:min-h-[24rem] sm:p-5"
    aria-labelledby="save-transfer-title"
    data-save-transfer
  >
    <div>
      <p class="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
        {{ t('home.saveTransfer.eyebrow') }}
      </p>
      <h2 id="save-transfer-title" class="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
        {{ t(props.exportOnly ? 'home.saveTransfer.exportTitle' : 'home.saveTransfer.title') }}
      </h2>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
        {{
          t(
            props.exportOnly
              ? 'home.saveTransfer.exportDescription'
              : 'home.saveTransfer.description',
          )
        }}
      </p>
    </div>

    <label class="mt-4 flex min-h-0 flex-1 flex-col">
      <span class="mb-1.5 text-sm font-bold">{{ t('home.saveTransfer.codeLabel') }}</span>
      <Textarea
        v-model="jsonText"
        class="min-h-48 w-full flex-1 resize-none font-mono text-xs leading-relaxed"
        :placeholder="t('home.saveTransfer.placeholder')"
        spellcheck="false"
        data-save-json
      />
    </label>

    <Message v-if="errorMessage" class="mt-3" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>
    <Message v-else-if="notice" class="mt-3" severity="success" :closable="false">
      {{ t(`home.saveTransfer.notices.${notice}`) }}
    </Message>

    <div class="mt-4 flex flex-wrap gap-2">
      <Button
        :label="t('home.saveTransfer.refresh')"
        icon="pi pi-refresh"
        outlined
        size="small"
        :loading="isExporting"
        type="button"
        @click="createExport"
      />
      <Button
        :label="t('home.saveTransfer.copy')"
        icon="pi pi-copy"
        outlined
        size="small"
        type="button"
        @click="copyJson"
      />
      <Button
        :label="t('home.saveTransfer.download')"
        icon="pi pi-download"
        outlined
        size="small"
        type="button"
        @click="downloadJson"
      />
      <Button
        v-if="!props.exportOnly"
        :label="t('home.saveTransfer.chooseFile')"
        icon="pi pi-file-import"
        outlined
        size="small"
        type="button"
        @click="chooseFile"
      />
      <Button
        v-if="!props.exportOnly"
        class="sm:ml-auto"
        :label="t('home.saveTransfer.import')"
        icon="pi pi-cloud-upload"
        severity="danger"
        size="small"
        :loading="isImporting"
        type="button"
        data-import-save
        @click="importJson"
      />
      <input
        v-if="!props.exportOnly"
        ref="fileInput"
        class="sr-only"
        type="file"
        accept="application/json,.json"
        tabindex="-1"
        @change="loadFile"
      />
    </div>
    <p v-if="!props.exportOnly" class="mt-3 text-xs leading-relaxed text-ink/50">
      {{ t('home.saveTransfer.warning') }}
    </p>
  </section>
</template>
