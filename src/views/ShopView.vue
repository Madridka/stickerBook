<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <!-- Показывает базовое состояние магазина до подключения наборов -->
  <section class="mx-auto w-full max-w-3xl">
    <p class="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-coral">{{ t('app.shop') }}</p>
    <h1 class="text-5xl font-black tracking-tight sm:text-6xl">{{ t('shop.title') }}</h1>
    <p class="mt-5 text-lg text-ink/65">{{ t('shop.text') }}</p>
    <div class="mt-12 border border-dashed border-ink/20 p-10 text-center text-ink/55">
      {{ t('shop.empty') }}
    </div>
  </section>
</template>
