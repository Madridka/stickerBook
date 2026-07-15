<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { formatPercent } from '@/utils/format'
import { useCollectionProgress, type CollectionProgress } from '@/composables/useCollectionProgress'

const { t } = useI18n()
const { collection, foundLabel }: CollectionProgress = useCollectionProgress()
</script>

<template>
  <!-- Показывает стартовый экран и текущий прогресс коллекции -->
  <section class="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
    <div v-motion :initial="{ opacity: 0, y: 18 }" :enter="{ opacity: 1, y: 0 }" class="max-w-2xl">
      <p class="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-coral">
        {{ t('home.eyebrow') }}
      </p>
      <h1 class="text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl">
        {{ t('home.title') }}
      </h1>
      <p class="mt-7 max-w-lg text-lg leading-8 text-ink/65">{{ t('home.text') }}</p>
      <div class="mt-9 flex flex-wrap gap-3">
        <RouterLink
          to="/album"
          class="bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-coral"
          >{{ t('home.openAlbum') }}</RouterLink
        >
        <RouterLink
          to="/shop"
          class="border border-ink/20 px-5 py-3 text-sm font-bold transition hover:border-coral hover:text-coral"
          >{{ t('home.visitShop') }}</RouterLink
        >
      </div>
    </div>
    <div class="border border-ink/10 bg-white p-7 shadow-[8px_8px_0_#b9d8c2] sm:p-10">
      <div class="mb-12 flex items-start justify-between">
        <span class="text-sm font-bold uppercase tracking-[0.14em] text-ink/50">{{
          t('home.progress')
        }}</span>
        <span class="text-4xl font-black text-coral">{{ formatPercent(collection.progress) }}</span>
      </div>
      <div class="h-3 bg-paper">
        <div class="h-full bg-coral transition-all" :style="{ width: `${collection.progress}%` }" />
      </div>
      <div class="mt-4 flex justify-between text-sm font-semibold text-ink/55">
        <span>{{ foundLabel }} {{ t('home.found') }}</span
        ><span>{{ t('home.next') }}</span>
      </div>
    </div>
  </section>
</template>
