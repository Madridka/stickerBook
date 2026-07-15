<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useTheme } from '@/composables/useTheme'
import { usePlayerStore } from '@/stores/player'

const { t } = useI18n()
const { isEmeraldPink, toggleTheme } = useTheme()
const player = usePlayerStore()
const menuRef: Ref<{ toggle: (event: Event) => void } | null> = ref(null)

const menuItems = computed(() => [
  {
    label: t('app.resetScore'),
    icon: 'pi pi-refresh',
    command: (): void => player.resetCoins(),
  },
])

const toggleMenu = (event: MouseEvent): void => menuRef.value?.toggle(event)
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
    <header class="border-b border-ink/10 bg-paper/90">
      <nav
        class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8 sm:py-4"
        aria-label="Main navigation"
      >
        <RouterLink to="/" class="text-xl font-black tracking-tight">{{
          t('app.title')
        }}</RouterLink>
        <div class="flex items-center gap-4 text-sm font-semibold sm:gap-7">
          <RouterLink class="transition-colors hover:text-coral" to="/album">{{
            t('app.album')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/shop">{{
            t('app.shop')
          }}</RouterLink>
          <Button
            class="theme-toggle__button"
            text
            rounded
            type="button"
            icon="pi pi-palette"
            :aria-label="t('common.theme')"
            :title="t('common.theme')"
            @click="toggleTheme"
          >
            <span class="sr-only">{{
              isEmeraldPink ? t('common.themeEmeraldPink') : t('common.themeDefault')
            }}</span>
          </Button>
          <Button class="app-menu-button" text :label="t('app.menu')" icon="pi pi-bars" type="button" @click="toggleMenu" />
          <Menu ref="menuRef" :model="menuItems" :popup="true" />
        </div>
      </nav>
    </header>
    <main
      class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-center overflow-hidden px-5 py-4 sm:px-8 sm:py-6"
    >
      <RouterView />
    </main>
  </div>
</template>
