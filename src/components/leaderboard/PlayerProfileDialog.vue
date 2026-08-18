<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import type { LeaderboardPlayerProfile } from '@/types/leaderboard'

interface PlayerProfileDialogProps {
  visible: boolean
  profile: LeaderboardPlayerProfile | null
  loading: boolean
  error: boolean
}

defineProps<PlayerProfileDialogProps>()
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'after-hide': []
}>()
const { t, te, locale } = useI18n()

const numberFormatter = computed(
  (): Intl.NumberFormat => new Intl.NumberFormat(locale.value),
)
const dateFormatter = computed(
  (): Intl.DateTimeFormat =>
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

const updateVisible = (visible: boolean): void => emit('update:visible', visible)
const notifyAfterHide = (): void => emit('after-hide')
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    class="w-[min(48rem,calc(100vw-1.5rem))]"
    :header="profile?.username ?? t('leaderboard.profile.title')"
    @update:visible="updateVisible"
    @after-hide="notifyAfterHide"
  >
    <!-- Показывает единое состояние ожидания или ошибки до получения публичного профиля. -->
    <div
      v-if="loading"
      class="flex min-h-72 items-center justify-center gap-3 font-black"
      role="status"
    >
      <i class="pi pi-spin pi-spinner text-2xl text-coral" aria-hidden="true" />
      {{ t('leaderboard.profile.loading') }}
    </div>

    <div
      v-else-if="error"
      class="flex min-h-72 flex-col items-center justify-center text-center"
      role="alert"
    >
      <i class="pi pi-exclamation-circle text-4xl text-coral" aria-hidden="true" />
      <p class="mt-3 font-black">{{ t('leaderboard.profile.error') }}</p>
    </div>

    <div v-else-if="profile">
      <!-- Сводные показатели отделены от подробной статистики журналов. -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <p class="text-xs font-black uppercase tracking-wider text-coral">
            {{ t('leaderboard.profile.position', { position: profile.position }) }}
          </p>
          <p class="mt-1 text-xs text-ink/50">
            {{ t('leaderboard.profile.memberSince', { date: formatDate(profile.createdAt) }) }}
          </p>
        </div>
        <div class="border-2 border-ink bg-gold/25 px-4 py-2 text-right">
          <strong class="block text-2xl font-black tabular-nums">
            {{ formatNumber(profile.totalCards) }}
          </strong>
          <span class="text-[10px] font-black uppercase tracking-wider text-ink/55">
            {{ t('leaderboard.profile.cards') }}
          </span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="border border-ink/15 bg-mint/15 p-3">
          <i class="pi pi-images text-coral" aria-hidden="true" />
          <strong class="mt-2 block text-xl font-black tabular-nums">
            {{ formatNumber(profile.uniqueCards) }}
          </strong>
          <span class="text-xs font-semibold text-ink/55">
            {{ t('leaderboard.profile.unique') }}
          </span>
        </div>
        <div class="border border-ink/15 bg-gold/15 p-3">
          <i class="pi pi-clone text-coral" aria-hidden="true" />
          <strong class="mt-2 block text-xl font-black tabular-nums">
            {{ formatNumber(profile.duplicateCards) }}
          </strong>
          <span class="text-xs font-semibold text-ink/55">
            {{ t('leaderboard.profile.duplicates') }}
          </span>
        </div>
        <div class="border border-ink/15 bg-mint/15 p-3">
          <i class="pi pi-book text-coral" aria-hidden="true" />
          <strong class="mt-2 block text-xl font-black tabular-nums">
            {{ formatNumber(profile.placedCards) }}
          </strong>
          <span class="text-xs font-semibold text-ink/55">
            {{ t('leaderboard.profile.placed') }}
          </span>
        </div>
        <div class="border border-ink/15 bg-gold/15 p-3">
          <i class="pi pi-check-circle text-coral" aria-hidden="true" />
          <strong class="mt-2 block text-xl font-black tabular-nums">
            {{ formatNumber(profile.completedTasks) }}
          </strong>
          <span class="text-xs font-semibold text-ink/55">
            {{ t('leaderboard.profile.tasks') }}
          </span>
        </div>
      </div>

      <!-- Раскладывает общее количество и вклейки по каждому журналу. -->
      <section class="mt-6">
        <h2 class="flex items-center gap-3 text-lg font-black">
          <span>{{ t('leaderboard.profile.albums') }}</span>
          <span class="h-px flex-1 bg-ink/15" />
        </h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div
            v-for="album in profile.albumDetails"
            :key="album.albumId"
            class="border-2 border-ink/15 bg-paper p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <strong class="font-black">{{ albumName(album.albumId) }}</strong>
              <span class="font-black tabular-nums">{{ formatNumber(album.totalCards) }}</span>
            </div>
            <p class="mt-2 flex items-center justify-between text-xs text-ink/60">
              <span>{{ t('leaderboard.profile.placedInAlbum') }}</span>
              <strong class="text-ink">{{ formatNumber(album.placedCards) }}</strong>
            </p>
          </div>
        </div>
      </section>

      <section class="mt-6 border-2 border-ink bg-mint/15 p-4">
        <h2 class="font-black">{{ t('leaderboard.profile.completedTitle') }}</h2>
        <div class="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span class="block text-ink/55">{{ t('leaderboard.profile.goals') }}</span>
            <strong class="text-lg tabular-nums">
              {{ formatNumber(profile.completedGoals) }}
            </strong>
          </div>
          <div>
            <span class="block text-ink/55">{{ t('leaderboard.profile.dailyTasks') }}</span>
            <strong class="text-lg tabular-nums">
              {{ formatNumber(profile.completedDailyTasks) }}
            </strong>
          </div>
        </div>
      </section>
    </div>
  </Dialog>
</template>
