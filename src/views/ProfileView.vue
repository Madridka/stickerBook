<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import Button from 'primevue/button'
import AuthView from '@/components/auth/AuthView.vue'
import { getPlayerAlbums } from '@/data/albumRegistry'
import { ApiError } from '@/services/api'
import { cloudSyncStatus } from '@/services/cloudSave'
import { getLeaderboardProfile } from '@/services/leaderboard'
import { useAuthStore } from '@/stores/auth'
import { useCollectionStore } from '@/stores/collection'
import { useDailyTasksStore } from '@/stores/dailyTasks'
import { useGoalsStore } from '@/stores/goals'
import type { LeaderboardAlbumDetails, LeaderboardPlayerProfile } from '@/types/leaderboard'

interface ProfileViewModel {
  username: string
  position?: number
  totalCards: number
  uniqueCards: number
  duplicateCards: number
  placedCards: number
  completedGoals: number
  completedDailyTasks: number
  createdAt?: number
  albumDetails: LeaderboardAlbumDetails[]
}

const { t, te, locale } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const collection = useCollectionStore()
const dailyTasks = useDailyTasksStore()
const goals = useGoalsStore()
const remoteProfile: Ref<LeaderboardPlayerProfile | null> = ref(null)
const isLoading: Ref<boolean> = ref(true)
const loadError: Ref<boolean> = ref(false)
let profileController: AbortController | undefined

const requestedUserId: ComputedRef<string | undefined> = computed(() =>
  typeof route.params.userId === 'string' ? route.params.userId : undefined,
)
const isOwnProfile: ComputedRef<boolean> = computed(
  () => !requestedUserId.value || requestedUserId.value === auth.user?.id,
)
const numberFormatter: ComputedRef<Intl.NumberFormat> = computed(
  () => new Intl.NumberFormat(locale.value),
)
const dateFormatter: ComputedRef<Intl.DateTimeFormat> = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
)
const formatNumber = (value: number): string => numberFormatter.value.format(value)
const formatDate = (value: number): string => dateFormatter.value.format(value)
const albumName = (albumId: string): string => {
  const key = `leaderboard.albumNames.${albumId}`
  return te(key) ? t(key) : albumId
}

// Собирает локальную статистику для гостя и дополняет её серверным местом в рейтинге.
const localProfile: ComputedRef<ProfileViewModel> = computed(() => {
  const activeCards = collection.items.filter(
    ({ instance }): boolean => instance.location !== 'deleted',
  )
  const albumDetails: LeaderboardAlbumDetails[] = getPlayerAlbums()
    .filter(({ cards }): boolean => cards.length > 0)
    .map((album): LeaderboardAlbumDetails => {
      const progress = collection.getAlbumProgress(album.id)
      return {
        albumId: album.id,
        totalCards: progress.collectedCards + collection.getAlbumDuplicates(album.id).length,
        placedCards: progress.placedCards,
      }
    })
  const completedGoals: number = goals.goals.filter(({ status }): boolean =>
    status === 'completed' || status === 'claimed',
  ).length

  return {
    username: auth.user?.username ?? t('profile.guestName'),
    position: remoteProfile.value?.position,
    totalCards: activeCards.length + collection.duplicateTotal,
    uniqueCards: activeCards.length,
    duplicateCards: collection.duplicateTotal,
    placedCards: activeCards.filter(({ instance }): boolean => instance.location === 'album').length,
    completedGoals,
    completedDailyTasks: dailyTasks.completedCount,
    createdAt: remoteProfile.value?.createdAt,
    albumDetails,
  }
})

const profile: ComputedRef<ProfileViewModel | null> = computed(() =>
  isOwnProfile.value ? localProfile.value : remoteProfile.value,
)
const syncLabel: ComputedRef<string> = computed(() =>
  auth.isGuest ? t('auth.guestLocalSave') : t(`auth.sync.${cloudSyncStatus.value}`),
)

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

// Загружает локальный профиль для владельца или публичный снимок выбранного игрока.
const loadProfile = async (): Promise<void> => {
  profileController?.abort()
  const controller = new AbortController()
  profileController = controller
  remoteProfile.value = null
  loadError.value = false
  isLoading.value = true

  if (isOwnProfile.value) {
    await Promise.all([collection.load(), goals.reload(), dailyTasks.load()])
  }
  if (controller.signal.aborted) return

  const targetUserId: string | undefined = requestedUserId.value ?? auth.user?.id
  if (!targetUserId) {
    isLoading.value = false
    return
  }

  try {
    const response = await getLeaderboardProfile(targetUserId, controller.signal)
    if (profileController === controller) remoteProfile.value = response.player
  } catch (error: unknown) {
    const isOwnUnranked: boolean =
      isOwnProfile.value && error instanceof ApiError && error.status === 404
    if (!isAbortError(error) && !isOwnUnranked && profileController === controller) {
      loadError.value = true
    }
  } finally {
    if (profileController === controller) isLoading.value = false
  }
}

watch(
  [requestedUserId, () => auth.user?.id],
  (): void => {
    void loadProfile()
  },
  { immediate: true },
)

onBeforeUnmount((): void => profileController?.abort())
</script>

<template>
  <section class="mx-auto h-full min-h-0 w-full max-w-5xl overflow-y-auto border border-ink/10 bg-gold/10 p-3 sm:p-5" data-profile-view>
    <header class="flex items-center justify-between gap-3 border-2 border-ink bg-paper p-3 shadow-[4px_4px_0_rgb(var(--color-gold)/0.65)] sm:p-5">
      <div class="min-w-0">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
          {{ t(isOwnProfile ? 'profile.ownProfile' : 'profile.publicProfile') }}
        </p>
        <h1 class="truncate text-2xl font-black sm:text-4xl">
          {{ profile?.username ?? t('profile.title') }}
        </h1>
        <p v-if="profile" class="mt-1 text-xs font-semibold text-ink/55">
          {{
            profile.position
              ? t('profile.rank', { position: profile.position })
              : loadError
                ? t('profile.rankUnavailable')
                : t('profile.notRanked')
          }}
          <template v-if="profile.createdAt"> · {{ t('profile.memberSince', { date: formatDate(profile.createdAt) }) }}</template>
        </p>
      </div>
      <span class="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-xl text-paper sm:size-16 sm:text-2xl">
        <i class="pi pi-user" aria-hidden="true" />
      </span>
    </header>

    <div v-if="isLoading && !profile" class="grid min-h-56 place-items-center" role="status">
      <p class="font-black"><i class="pi pi-spin pi-spinner mr-2 text-coral" />{{ t('profile.loading') }}</p>
    </div>

    <div v-else-if="loadError && !profile" class="mt-4 border-2 border-coral/40 bg-paper p-6 text-center" role="alert">
      <i class="pi pi-exclamation-circle text-3xl text-coral" aria-hidden="true" />
      <h2 class="mt-2 font-black">{{ t('profile.errorTitle') }}</h2>
      <p class="mt-1 text-sm text-ink/60">{{ t('profile.errorText') }}</p>
      <RouterLink class="mt-4 inline-flex font-black text-coral hover:underline" to="/leaderboard">
        {{ t('profile.backToLeaderboard') }}
      </RouterLink>
    </div>

    <template v-else-if="profile">
      <div v-if="isOwnProfile" class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section class="border-2 p-3 sm:p-4" :class="auth.user ? 'border-mint bg-mint/15 lg:col-span-2' : 'border-coral/40 bg-coral/10'">
          <div class="flex items-center gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-paper">
              <i :class="auth.user ? 'pi pi-cloud' : 'pi pi-desktop'" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <strong class="block">{{ auth.user ? t('profile.account.connectedBadge') : t('profile.account.guestBadge') }}</strong>
              <p class="truncate text-xs text-ink/55">{{ syncLabel }}</p>
            </div>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-ink/65">
            {{ auth.user ? t('profile.account.connectedText', { username: auth.user.username }) : t('profile.account.guestText') }}
          </p>
          <Button
            v-if="auth.user"
            class="mt-3"
            :label="t('profile.account.logout')"
            icon="pi pi-sign-out"
            severity="secondary"
            outlined
            size="small"
            :loading="auth.isSubmitting"
            @click="auth.logout()"
          />
        </section>

        <aside v-if="!auth.user" class="row-span-3 lg:col-start-2 lg:row-start-1">
          <div class="mb-3 border-l-4 border-coral bg-paper p-3 text-sm text-ink/70">
            <strong class="block">{{ t('profile.account.guestTitle') }}</strong>
            <ul class="mt-2 space-y-1 text-xs">
              <li><i class="pi pi-check mr-1 text-coral" />{{ t('profile.account.benefitSync') }}</li>
              <li><i class="pi pi-check mr-1 text-coral" />{{ t('profile.account.benefitDevices') }}</li>
              <li><i class="pi pi-check mr-1 text-coral" />{{ t('profile.account.benefitTransfer') }}</li>
            </ul>
          </div>
          <AuthView embedded />
        </aside>
      </div>

      <section
        class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6"
        :aria-label="t('profile.statsLabel')"
      >
        <div class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-images text-coral" /><strong class="mt-1 block text-xl font-black tabular-nums">{{ formatNumber(profile.totalCards) }}</strong><span class="text-xs text-ink/55">{{ t('profile.stats.total') }}</span>
        </div>
        <div class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-check-circle text-coral" /><strong class="mt-1 block text-xl font-black tabular-nums">{{ formatNumber(profile.uniqueCards) }}</strong><span class="text-xs text-ink/55">{{ t('profile.stats.unique') }}</span>
        </div>
        <div class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-clone text-coral" /><strong class="mt-1 block text-xl font-black tabular-nums">{{ formatNumber(profile.duplicateCards) }}</strong><span class="text-xs text-ink/55">{{ t('profile.stats.duplicates') }}</span>
        </div>
        <div class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-book text-coral" /><strong class="mt-1 block text-xl font-black tabular-nums">{{ formatNumber(profile.placedCards) }}</strong><span class="text-xs text-ink/55">{{ t('profile.stats.placed') }}</span>
        </div>
        <div class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-flag text-coral" /><strong class="mt-1 block text-xl font-black tabular-nums">{{ formatNumber(profile.completedGoals) }}</strong><span class="text-xs text-ink/55">{{ t('profile.stats.goals') }}</span>
        </div>
        <div class="border border-ink/15 bg-paper p-3">
          <i class="pi pi-calendar-clock text-coral" /><strong class="mt-1 block text-xl font-black tabular-nums">{{ formatNumber(profile.completedDailyTasks) }}</strong><span class="text-xs text-ink/55">{{ t('profile.stats.dailyTasks') }}</span>
        </div>
      </section>

      <section class="mt-5">
        <h2 class="flex items-center gap-3 text-lg font-black"><span>{{ t('profile.albums') }}</span><span class="h-px flex-1 bg-ink/15" /></h2>
        <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <div v-for="album in profile.albumDetails" :key="album.albumId" class="border border-ink/15 bg-paper p-2.5">
            <strong class="block truncate text-sm">{{ albumName(album.albumId) }}</strong>
            <p class="mt-1 flex justify-between gap-2 text-[11px] text-ink/55"><span>{{ t('profile.albumCards') }}</span><b class="text-ink tabular-nums">{{ formatNumber(album.totalCards) }}</b></p>
            <p class="flex justify-between gap-2 text-[11px] text-ink/55"><span>{{ t('profile.albumPlaced') }}</span><b class="text-ink tabular-nums">{{ formatNumber(album.placedCards) }}</b></p>
          </div>
        </div>
      </section>

      <section v-if="isOwnProfile" class="mt-5 pb-2">
        <h2 class="text-lg font-black">{{ t('profile.features.title') }}</h2>
        <div class="mt-2 grid gap-2 sm:grid-cols-3">
          <RouterLink class="border border-ink/15 bg-paper p-3 transition hover:border-coral" :to="{ name: 'collection', query: { tab: 'duplicates' } }">
            <i class="pi pi-replay text-coral" /><strong class="ml-2 text-sm">{{ t('profile.features.duplicates') }}</strong><p class="mt-1 text-xs text-ink/55">{{ t('profile.features.duplicatesText') }}</p>
          </RouterLink>
          <RouterLink class="border border-ink/15 bg-paper p-3 transition hover:border-coral" :to="{ name: 'shop', query: { section: 'picks' } }">
            <i class="pi pi-sparkles text-coral" /><strong class="ml-2 text-sm">{{ t('profile.features.picks') }}</strong><p class="mt-1 text-xs text-ink/55">{{ t('profile.features.picksText') }}</p>
          </RouterLink>
          <RouterLink class="border border-ink/15 bg-paper p-3 transition hover:border-coral" :to="{ name: 'goals' }">
            <i class="pi pi-flag text-coral" /><strong class="ml-2 text-sm">{{ t('profile.features.goals') }}</strong><p class="mt-1 text-xs text-ink/55">{{ t('profile.features.goalsText') }}</p>
          </RouterLink>
        </div>
      </section>
    </template>
  </section>
</template>
