<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SaveTransferPanel from '@/components/SaveTransferPanel.vue'

const { t } = useI18n()
</script>

<template>
  <main class="min-h-dvh bg-paper px-4 py-6 text-ink sm:px-6 sm:py-10">
    <div class="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-4xl flex-col sm:min-h-[calc(100dvh-5rem)]">
      <header class="mb-5">
        <p class="text-xs font-black uppercase tracking-[0.2em] text-coral">
          {{ t('app.title') }}
        </p>
      </header>
      <SaveTransferPanel class="flex-1" export-only />
    </div>
  </main>
</template>
