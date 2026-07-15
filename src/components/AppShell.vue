<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { usePlayerStore } from '@/stores/player'

const { t } = useI18n()
const { isEmeraldPink, toggleTheme } = useTheme()
const player = usePlayerStore()
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
    <!-- Показывает общую навигацию и активное представление приложения -->
    <header class="border-b border-ink/10 bg-paper/90">
      <nav
        class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4"
        aria-label="Main navigation"
      >
        <RouterLink to="/" class="text-xl font-black tracking-tight">{{
          t('app.title')
        }}</RouterLink>
        <details class="relative text-sm font-semibold">
          <summary class="cursor-pointer list-none transition-colors hover:text-coral">
            {{ t('app.menu') }}
          </summary>
          <div class="absolute right-0 top-8 z-20 grid min-w-44 gap-1 border border-ink/10 bg-paper p-2 shadow-lg">
            <RouterLink class="px-3 py-2 transition-colors hover:bg-coral/10 hover:text-coral" to="/album">{{ t('app.album') }}</RouterLink>
            <RouterLink class="px-3 py-2 transition-colors hover:bg-coral/10 hover:text-coral" to="/shop">{{ t('app.shop') }}</RouterLink>
            <button class="flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-coral/10 hover:text-coral" type="button" :aria-label="t('common.theme')" @click="toggleTheme">
              <span class="theme-toggle__swatch" aria-hidden="true" />
              <span>{{ isEmeraldPink ? t('common.themeEmeraldPink') : t('common.themeDefault') }}</span>
            </button>
            <button class="border-t border-ink/10 px-3 py-2 text-left text-coral transition-colors hover:bg-coral/10" type="button" @click="player.resetCoins">
              {{ t('app.resetScore') }}
            </button>
          </div>
        </details>
      </nav>
    </header>
    <main class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 overflow-hidden px-5 py-4 sm:px-8 sm:py-6">
      <RouterView />
    </main>
  </div>
</template>
