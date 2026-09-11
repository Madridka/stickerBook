<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import packageMetadata from '../../package.json'
import changelogMarkdown from '@/change-log/CHANGELOG.md?raw'

interface ReleaseNote {
  title: string
  items: string[]
}

const { t } = useI18n()
const releaseVersion: string = packageMetadata.version
const storageKey: string = 'sticker-book:last-seen-release'
const isVisible: Ref<boolean> = ref(false)

const toPlainText = (value: string): string =>
  value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim()

const readReleaseNote = (markdown: string, version: string): ReleaseNote | null => {
  const escapedVersion: string = version.replace(/\./g, '\\.')
  const headingPattern = new RegExp(
    `^##\\s+${escapedVersion}\\s+—\\s+(.+)\\r?\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
    'm',
  )
  const match: RegExpMatchArray | null = markdown.match(headingPattern)
  if (match === null) return null

  const items: string[] = match[2]
    .split(/\r?\n/)
    .filter((line: string): boolean => /^-\s+/.test(line))
    .map((line: string): string => toPlainText(line.replace(/^-\s+/, '')))

  return { title: toPlainText(match[1]), items }
}

const releaseNote: ReleaseNote | null = readReleaseNote(changelogMarkdown, releaseVersion)

const readLastSeenRelease = (): string | null => {
  try {
    return window.localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

const rememberRelease = (): void => {
  try {
    window.localStorage.setItem(storageKey, releaseVersion)
  } catch {
    // В приватном режиме диалог остаётся безопасно закрываемым без localStorage.
  }
}

const close = (): void => {
  rememberRelease()
  isVisible.value = false
}

onMounted((): void => {
  isVisible.value = readLastSeenRelease() !== releaseVersion
})
</script>

<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    :closable="false"
    :close-on-escape="false"
    class="w-[min(42rem,calc(100vw-1.5rem))]"
    :header="t('app.releaseWelcome.title')"
    data-release-welcome
  >
    <div class="space-y-4">
      <div class="border-l-4 border-coral bg-coral/10 px-4 py-3">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coral">
          {{ t('app.releaseWelcome.version', { version: releaseVersion }) }}
        </p>
        <p class="mt-1 text-sm leading-relaxed text-ink/70">
          {{ releaseNote?.title ?? t('app.releaseWelcome.intro') }}
        </p>
      </div>

      <ul
        v-if="releaseNote?.items.length"
        class="grid gap-2 sm:grid-cols-2"
        :aria-label="t('app.releaseWelcome.featuresLabel')"
      >
        <li
          v-for="item in releaseNote.items"
          :key="item"
          class="flex gap-3 border border-ink/15 bg-paper p-3"
        >
          <i class="pi pi-sparkles mt-0.5 text-coral" aria-hidden="true" />
          <span class="text-xs leading-relaxed text-ink/70">{{ item }}</span>
        </li>
      </ul>
    </div>

    <template #footer>
      <Button
        autofocus
        icon="pi pi-play"
        :label="t('app.releaseWelcome.start')"
        type="button"
        @click="close"
      />
    </template>
  </Dialog>
</template>
