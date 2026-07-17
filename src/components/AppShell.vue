<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Menu from 'primevue/menu'
import { database } from '@/db/database'
import { useTheme } from '@/composables/useTheme'

const { t } = useI18n()
const { isEmeraldPink, toggleTheme } = useTheme()
const route = useRoute()
const isPackOpening = computed((): boolean => route.meta.packOpening === true)
const isAlbum = computed((): boolean => route.name === 'album')
const menuRef: Ref<{ toggle: (event: Event) => void } | null> = ref(null)
const isResetConfirmOpen: Ref<boolean> = ref(false)
const isResetting: Ref<boolean> = ref(false)

// Формирует команды выпадающего меню приложения
const menuItems = computed(() => [
  {
    label: t('app.resetProgress'),
    icon: 'pi pi-trash',
    command: (): void => {
      isResetConfirmOpen.value = true
    },
  },
])

// Открывает или закрывает меню по нажатию на кнопку
const toggleMenu = (event: MouseEvent): void => menuRef.value?.toggle(event)

const resetProgress = async (): Promise<void> => {
  if (isResetting.value) return

  isResetting.value = true

  try {
    await database.delete()
    window.location.reload()
  } finally {
    isResetting.value = false
  }
}
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

    <Dialog
      v-model:visible="isResetConfirmOpen"
      modal
      :closable="!isResetting"
      :header="t('app.resetProgressTitle')"
      :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
    >
      <p class="text-sm leading-relaxed text-ink/70">
        {{ t('app.resetProgressText') }}
      </p>

      <template #footer>
        <Button
          :label="t('app.cancel')"
          text
          type="button"
          :disabled="isResetting"
          @click="isResetConfirmOpen = false"
        />
        <Button
          :label="t('app.resetProgressConfirm')"
          icon="pi pi-trash"
          severity="danger"
          type="button"
          :loading="isResetting"
          @click="resetProgress"
        />
      </template>
    </Dialog>
  </div>
</template>
