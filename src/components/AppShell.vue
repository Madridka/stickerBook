<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useTheme } from '@/composables/useTheme'
import { usePlayerStore } from '@/stores/player'

const { t } = useI18n()
const { isEmeraldPink, toggleTheme } = useTheme()
const player = usePlayerStore()
const route = useRoute()
const isPackOpening = computed((): boolean => route.meta.packOpening === true)
const isAlbum = computed((): boolean => route.name === 'album')
const menuRef: Ref<{ toggle: (event: Event) => void } | null> = ref(null)

// Формирует команды выпадающего меню приложения
const menuItems = computed(() => [
  {
    label: t('app.resetScore'),
    icon: 'pi pi-refresh',
    command: (): void => player.resetCoins(),
  },
])

// Открывает или закрывает меню по нажатию на кнопку
const toggleMenu = (event: MouseEvent): void => menuRef.value?.toggle(event)
</script>

<template>
  <!-- Общая оболочка с фиксированной высотой viewport -->
  <div class="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
    <!-- Верхняя навигационная панель -->
    <header class="border-b border-ink/10 bg-paper/90">
      <nav
        class="mx-auto flex w-full max-w-[90rem] items-center justify-between px-5 py-3 sm:px-8 sm:py-4"
        aria-label="Main navigation"
      >
        <!-- Логотип и ссылка на главный экран -->
        <RouterLink v-if="!isPackOpening" to="/" class="text-xl font-black tracking-tight">{{
          t('app.title')
        }}</RouterLink>
        <span v-else class="text-xl font-black tracking-tight">{{ t('app.title') }}</span>
        <!-- Навигация, переключатель темы и меню -->
        <div v-if="!isPackOpening" class="flex items-center gap-4 text-sm font-semibold sm:gap-7">
          <RouterLink class="transition-colors hover:text-coral" to="/album">{{
            t('app.album')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/collection">{{
            t('app.collection')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/shop">{{
            t('app.shop')
          }}</RouterLink>
          <button
            class="theme-toggle__button"
            type="button"
            :aria-label="t('common.theme')"
            :title="t('common.theme')"
            @click="toggleTheme"
          >
            <span class="theme-toggle__swatch" aria-hidden="true" />
            <span class="sr-only">{{
              isEmeraldPink ? t('common.themeEmeraldPink') : t('common.themeDefault')
            }}</span>
          </button>

          <Button
            class="app-menu-button"
            text
            :label="t('app.menu')"
            icon="pi pi-bars"
            type="button"
            @click="toggleMenu"
          />

          <Menu ref="menuRef" :model="menuItems" :popup="true" />
        </div>
      </nav>
    </header>

    <!-- Область отображения текущего маршрута -->
    <main
      class="flex min-h-0 w-full flex-1 items-center overflow-hidden"
      :class="isAlbum ? 'max-w-none p-0' : 'mx-auto max-w-6xl px-5 py-4 sm:px-8 sm:py-6'"
    >
      <RouterView />
    </main>
  </div>
</template>
