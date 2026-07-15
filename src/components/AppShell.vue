<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView } from 'vue-router'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <!-- Показывает общую навигацию и активное представление приложения -->
    <header class="border-b border-ink/10 bg-paper/90">
      <nav
        class="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"
        aria-label="Main navigation"
      >
        <RouterLink to="/" class="text-xl font-black tracking-tight">{{
          t('app.title')
        }}</RouterLink>
        <div class="flex gap-5 text-sm font-semibold sm:gap-8">
          <RouterLink class="transition-colors hover:text-coral" to="/album">{{
            t('app.album')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/shop">{{
            t('app.shop')
          }}</RouterLink>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in"><component :is="Component" /></Transition>
      </RouterView>
    </main>
  </div>
</template>
