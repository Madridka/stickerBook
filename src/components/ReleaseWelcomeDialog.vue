<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import packageMetadata from '../../package.json'

const { t } = useI18n()
const releaseVersion: string = packageMetadata.version
const storageKey: string = 'sticker-book:last-seen-release'
const isVisible: Ref<boolean> = ref(false)

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
          {{ t('app.releaseWelcome.intro') }}
        </p>
      </div>

      <ul class="grid gap-2 sm:grid-cols-2" :aria-label="t('app.releaseWelcome.featuresLabel')">
        <li class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-id-card mb-2 block text-xl text-coral" aria-hidden="true" />
          <strong class="block text-sm">{{ t('app.releaseWelcome.features.ucl.title') }}</strong>
          <span class="mt-1 block text-xs leading-relaxed text-ink/60">
            {{ t('app.releaseWelcome.features.ucl.description') }}
          </span>
        </li>
        <li class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-shield mb-2 block text-xl text-coral" aria-hidden="true" />
          <strong class="block text-sm">{{ t('app.releaseWelcome.features.england.title') }}</strong>
          <span class="mt-1 block text-xs leading-relaxed text-ink/60">
            {{ t('app.releaseWelcome.features.england.description') }}
          </span>
        </li>
        <li class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-user mb-2 block text-xl text-coral" aria-hidden="true" />
          <strong class="block text-sm">{{ t('app.releaseWelcome.features.profile.title') }}</strong>
          <span class="mt-1 block text-xs leading-relaxed text-ink/60">
            {{ t('app.releaseWelcome.features.profile.description') }}
          </span>
        </li>
        <li class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-sparkles mb-2 block text-xl text-coral" aria-hidden="true" />
          <strong class="block text-sm">{{ t('app.releaseWelcome.features.picks.title') }}</strong>
          <span class="mt-1 block text-xs leading-relaxed text-ink/60">
            {{ t('app.releaseWelcome.features.picks.description') }}
          </span>
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
