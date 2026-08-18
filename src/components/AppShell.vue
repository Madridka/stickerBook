<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { HOME_VIEW_CONFIG } from '@/config/runtimeConfig'
import { clearLocalGameData, cloudSave, cloudSyncStatus } from '@/services/cloudSave'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { formatEnergy } from '@/utils/format'

import Menu from 'primevue/menu'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

const { t } = useI18n()
const { isEmeraldPink, toggleTheme } = useTheme()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const player = usePlayerStore()
const isPackOpening = computed((): boolean => route.meta.packOpening === true)
const isAlbumWorkspace = computed((): boolean => route.meta.albumWorkspace === true)
const isRouteLoading: Ref<boolean> = ref(false)
const desktopMenuRef: Ref<{ toggle: (event: Event) => void } | null> = ref(null)
const mobileMenuRef: Ref<{ toggle: (event: Event) => void } | null> = ref(null)
const isResetConfirmOpen: Ref<boolean> = ref(false)
const isResetting: Ref<boolean> = ref(false)
let resourceTimer: number | undefined

// Ленивые экраны могут загружаться заметное время, поэтому показываем состояние
// перехода, пока роутер получает и подготавливает следующий раздел.
const removeRouteLoadingStart = router.beforeEach((): void => {
  isRouteLoading.value = true
})
const removeRouteLoadingEnd = router.afterEach((): void => {
  isRouteLoading.value = false
})
const removeRouteLoadingError = router.onError((): void => {
  isRouteLoading.value = false
})

const resetProgressItem = computed(() => ({
  label: t('app.resetProgress'),
  icon: 'pi pi-trash',
  command: (): void => {
    isResetConfirmOpen.value = true
  },
}))

const accountItem = computed(() => ({
  label: auth.isGuest ? t('auth.guestAccount') : (auth.user?.username ?? ''),
  icon: 'pi pi-user',
  disabled: true,
}))

const syncItem = computed(() => ({
  label: auth.isGuest ? t('auth.guestLocalSave') : t(`auth.sync.${cloudSyncStatus.value}`),
  icon: auth.isGuest
    ? 'pi pi-desktop'
    : cloudSyncStatus.value === 'conflict' || cloudSyncStatus.value === 'offline'
      ? 'pi pi-exclamation-triangle'
      : cloudSyncStatus.value === 'saving' || cloudSyncStatus.value === 'loading'
        ? 'pi pi-sync pi-spin'
        : 'pi pi-cloud-upload',
  disabled: true,
}))

const logoutItem = computed(() => ({
  label: t('auth.logout'),
  icon: 'pi pi-sign-out',
  command: (): void => {
    if (auth.isGuest) {
      auth.exitGuest()
      return
    }
    void auth.logout()
  },
}))

const desktopMenuItems = computed(() => [
  accountItem.value,
  syncItem.value,
  { separator: true },
  resetProgressItem.value,
  logoutItem.value,
])

// На мобильном экране объединяет основную навигацию и административный сброс.
const mobileMenuItems = computed(() => [
  {
    label: t('app.home'),
    icon: 'pi pi-home',
    command: (): void => {
      void router.push('/')
    },
  },
  {
    label: t('app.album'),
    icon: 'pi pi-book',
    command: (): void => {
      void router.push('/album')
    },
  },
  {
    label: t('app.collection'),
    icon: 'pi pi-images',
    command: (): void => {
      void router.push('/collection')
    },
  },
  {
    label: t('app.shop'),
    icon: 'pi pi-shopping-bag',
    command: (): void => {
      void router.push('/shop')
    },
  },
  {
    label: t('app.goals'),
    icon: 'pi pi-flag',
    command: (): void => {
      void router.push('/goals')
    },
  },
  // {
  //   label: t('app.leaderboard'),
  //   icon: 'pi pi-trophy',
  //   command: (): void => {
  //     void router.push('/leaderboard')
  //   },
  // },
  {
    label: t('common.theme'),
    icon: 'pi pi-palette',
    command: toggleTheme,
  },
  { separator: true },
  accountItem.value,
  syncItem.value,
  { separator: true },
  resetProgressItem.value,
  logoutItem.value,
])

const toggleDesktopMenu = (event: MouseEvent): void => desktopMenuRef.value?.toggle(event)
const toggleMobileMenu = (event: MouseEvent): void => mobileMenuRef.value?.toggle(event)

const resetProgress = async (): Promise<void> => {
  if (isResetting.value) return

  isResetting.value = true

  try {
    await clearLocalGameData()
    await cloudSave.flush()
    window.location.reload()
  } finally {
    isResetting.value = false
  }
}

onMounted((): void => {
  player.refreshEnergy()
  resourceTimer = window.setInterval(
    (): void => player.refreshEnergy(),
    HOME_VIEW_CONFIG.energyRefreshIntervalMs,
  )
})

onBeforeUnmount((): void => {
  if (resourceTimer !== undefined) window.clearInterval(resourceTimer)
  removeRouteLoadingStart()
  removeRouteLoadingEnd()
  removeRouteLoadingError()
})
</script>

<template>
  <!-- Общая оболочка с фиксированной высотой viewport -->
  <div class="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
    <!-- Верхняя навигационная панель -->
    <header class="border-b border-ink/10 bg-paper/90">
      <nav
        class="mx-auto flex w-full max-w-[90rem] items-center justify-between px-5 py-2 sm:px-8 sm:py-3"
        :aria-label="t('app.mainNavigation')"
      >
        <!-- Логотип и ссылка на главный экран -->
        <RouterLink v-if="!isPackOpening" to="/" class="text-xl font-black tracking-tight">{{
          t('app.title')
        }}</RouterLink>
        <span v-else class="text-xl font-black tracking-tight">{{ t('app.title') }}</span>

        <div
          class="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ml-4"
          :aria-label="t('app.resources')"
          data-player-resources
        >
          <div
            class="flex items-center gap-1 rounded-full border border-ink/15 bg-gold/15 px-2 py-1 text-xs font-black tabular-nums sm:px-2.5"
            :title="t('home.summary.coins')"
            data-resource-coins
          >
            <i class="pi pi-wallet text-coral" aria-hidden="true" />
            <span>{{ t('home.summary.coins') }}</span>
            <span>{{ player.formattedCoins }}</span>
          </div>
          <div
            class="flex items-center gap-1 rounded-full border border-ink/15 bg-mint/20 px-2 py-1 text-xs font-black tabular-nums sm:px-2.5"
            :title="t('home.energyTitle')"
            data-resource-energy
          >
            <i class="pi pi-bolt text-coral" aria-hidden="true" />
            <span>{{ player.availableEnergy }} / {{ player.energyLimit }}</span>
            <span class="hidden text-[9px] uppercase tracking-wide text-ink/45 lg:inline">
              {{ t('home.energyTitle') }}
            </span>
          </div>
        </div>

        <!-- Навигация, переключатель темы и меню -->
        <div
          v-if="!isPackOpening"
          class="hidden items-center gap-5 text-sm font-semibold xl:ml-4 xl:flex"
        >
          <RouterLink class="transition-colors hover:text-coral" to="/">{{
            t('app.home')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/album">{{
            t('app.album')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/collection">{{
            t('app.collection')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/shop">{{
            t('app.shop')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/goals">{{
            t('app.goals')
          }}</RouterLink>
          <RouterLink class="transition-colors hover:text-coral" to="/leaderboard">{{
            t('app.leaderboard')
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
            @click="toggleDesktopMenu"
          />

          <Menu ref="desktopMenuRef" :model="desktopMenuItems" :popup="true" />
        </div>

        <div v-if="!isPackOpening" class="ml-1 flex items-center xl:hidden">
          <Button
            class="app-menu-button"
            text
            :aria-label="t('app.menu')"
            :title="t('app.menu')"
            icon="pi pi-bars"
            type="button"
            @click="toggleMobileMenu"
          />

          <Menu
            ref="mobileMenuRef"
            class="mobile-app-menu"
            :model="mobileMenuItems"
            :popup="true"
          />
        </div>
      </nav>
    </header>

    <!-- Область отображения текущего маршрута -->
    <main
      class="relative flex min-h-0 w-full flex-1 items-center overflow-hidden"
      :class="isAlbumWorkspace ? 'max-w-none p-0' : 'mx-auto max-w-6xl px-5 py-2 sm:px-8 sm:py-4'"
      :aria-busy="isRouteLoading"
    >
      <RouterView />

      <Transition name="route-loading">
        <div
          v-if="isRouteLoading"
          class="absolute inset-0 z-50 flex items-center justify-center bg-paper/85 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          data-route-loading
        >
          <div
            class="flex items-center gap-3 border-2 border-ink bg-paper px-5 py-4 font-black shadow-[5px_5px_0_rgb(var(--color-coral))]"
          >
            <i class="pi pi-spin pi-spinner text-2xl text-coral" aria-hidden="true" />
            <span>{{ t('common.sectionLoading') }}</span>
          </div>
        </div>
      </Transition>
    </main>

    <Dialog
      v-model:visible="isResetConfirmOpen"
      modal
      class="w-[min(28rem,calc(100vw-2rem))]"
      :closable="!isResetting"
      :header="t('app.resetProgressTitle')"
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

<style scoped>
.route-loading-enter-active,
.route-loading-leave-active {
  transition: opacity 150ms ease;
}

.route-loading-enter-from,
.route-loading-leave-to {
  opacity: 0;
}
</style>
