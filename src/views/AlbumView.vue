<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useCollectionProgress } from '../composables/useCollectionProgress'

const { t } = useI18n()
const { collection } = useCollectionProgress()
</script>

<template>
  <!-- Показывает сводку альбома до появления страниц и стикеров -->
  <section>
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-coral">
          {{ t('app.collection') }}
        </p>
        <h1 class="text-5xl font-black tracking-tight sm:text-6xl">{{ t('album.title') }}</h1>
        <p class="mt-5 text-lg text-ink/65">{{ t('album.text') }}</p>
      </div>
      <div class="text-right text-sm font-semibold text-ink/55">
        <strong class="block text-3xl font-black text-ink">{{ collection.pages }}</strong
        >{{ t('album.pages') }}
      </div>
    </div>
    <div class="mt-12 border border-dashed border-ink/20 p-10 text-center text-ink/55">
      {{ t('album.empty') }}
    </div>
  </section>
</template>
