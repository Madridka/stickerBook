<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable.vue'
import { LEADERBOARD_CONFIG } from '@/config/gameBalance'
import { getLeaderboard } from '@/services/leaderboard'
import type {
  LeaderboardPlayer,
  LeaderboardResponse,
} from '@/types/leaderboard'

const { t, locale } = useI18n()
const router = useRouter()
const leaderboard: Ref<LeaderboardResponse | null> = ref(null)
const isLoading: Ref<boolean> = ref(true)
const loadError: Ref<boolean> = ref(false)
let leaderboardController: AbortController | undefined

const timeFormatter = computed(
  (): Intl.DateTimeFormat =>
    new Intl.DateTimeFormat(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
    }),
)

const minimumCards: ComputedRef<number> = computed(
  (): number => leaderboard.value?.minimumCards ?? LEADERBOARD_CONFIG.minimumCards,
)
const nextRefreshLabel: ComputedRef<string> = computed((): string =>
  leaderboard.value ? timeFormatter.value.format(leaderboard.value.nextRefreshAt) : '',
)

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

// Загружает согласованный серверный снимок рейтинга и отменяет устаревший запрос.
const loadLeaderboard = async (): Promise<void> => {
  leaderboardController?.abort()
  const controller = new AbortController()
  leaderboardController = controller
  isLoading.value = true
  loadError.value = false

  try {
    leaderboard.value = await getLeaderboard(controller.signal)
  } catch (error: unknown) {
    if (!isAbortError(error) && leaderboardController === controller) loadError.value = true
  } finally {
    if (leaderboardController === controller) isLoading.value = false
  }
}

// У каждого игрока есть собственный адрес профиля вместо временного диалога.
const openProfile = (player: LeaderboardPlayer): void => {
  void router.push({ name: 'public-profile', params: { userId: player.userId } })
}

onMounted((): void => {
  void loadLeaderboard()
})

onBeforeUnmount((): void => {
  leaderboardController?.abort()
})
</script>

<template>
  <section
    class="leaderboard-view mx-auto h-full min-h-0 w-full overflow-y-auto border border-ink/10 px-3 py-3 sm:px-4 sm:py-4"
    data-leaderboard-view
  >
    <!-- Представляет правила рейтинга и время следующего часового снимка. -->
    <header
      class="relative overflow-hidden border-2 border-ink bg-paper p-4 shadow-[6px_6px_0_rgb(var(--color-gold)/0.65)] sm:p-5"
    >
      <div
        class="pointer-events-none absolute -right-8 -top-10 text-[9rem] text-gold/20"
        aria-hidden="true"
      >
        <i class="pi pi-trophy" />
      </div>
      <div class="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.18em] text-coral">
            {{ t('leaderboard.eyebrow') }}
          </p>
          <h1 class="mt-1 text-3xl font-black">{{ t('leaderboard.title') }}</h1>
          <p class="mt-1 max-w-2xl text-sm text-ink/65">
            {{ t('leaderboard.description', { count: minimumCards }) }}
          </p>
        </div>
        <div
          v-if="leaderboard"
          class="border border-ink/15 bg-mint/20 px-3 py-2 text-xs font-bold text-ink/65"
        >
          <i class="pi pi-clock mr-1 text-coral" aria-hidden="true" />
          {{ t('leaderboard.nextRefresh', { time: nextRefreshLabel }) }}
        </div>
      </div>
    </header>

    <!-- Разделяет ожидание, сетевую ошибку и отсутствие прошедших порог игроков. -->
    <div
      v-if="isLoading"
      class="mt-5 flex min-h-64 items-center justify-center border-2 border-dashed border-ink/20 bg-paper/70"
      role="status"
    >
      <div class="flex items-center gap-3 font-black">
        <i class="pi pi-spin pi-spinner text-2xl text-coral" aria-hidden="true" />
        {{ t('leaderboard.loading') }}
      </div>
    </div>

    <div
      v-else-if="loadError"
      class="mt-5 flex min-h-64 flex-col items-center justify-center gap-4 border-2 border-coral/40 bg-paper p-6 text-center"
      role="alert"
    >
      <i class="pi pi-exclamation-triangle text-4xl text-coral" aria-hidden="true" />
      <div>
        <h2 class="font-black">{{ t('leaderboard.errors.loadTitle') }}</h2>
        <p class="mt-1 text-sm text-ink/60">{{ t('leaderboard.errors.loadText') }}</p>
      </div>
      <Button
        :label="t('leaderboard.retry')"
        icon="pi pi-refresh"
        type="button"
        @click="loadLeaderboard"
      />
    </div>

    <div
      v-else-if="!leaderboard?.players.length"
      class="mt-5 flex min-h-64 flex-col items-center justify-center border-2 border-dashed border-ink/20 bg-paper/70 p-6 text-center"
    >
      <i class="pi pi-users text-4xl text-ink/25" aria-hidden="true" />
      <h2 class="mt-3 font-black">{{ t('leaderboard.empty.title') }}</h2>
      <p class="mt-1 max-w-md text-sm text-ink/60">
        {{ t('leaderboard.empty.text', { count: minimumCards }) }}
      </p>
    </div>

    <!-- Таблица инкапсулирует сравнение колонок и выбор игрока. -->
    <LeaderboardTable
      v-else
      class="mt-5"
      :players="leaderboard.players"
      @select="openProfile"
    />

  </section>
</template>

<style scoped>
.leaderboard-view {
  background-color: rgb(var(--color-gold) / 0.12);
  background-image:
    radial-gradient(circle at 15% 20%, rgb(var(--color-coral) / 0.08) 0 2px, transparent 3px),
    radial-gradient(circle at 85% 70%, rgb(var(--color-mint) / 0.22) 0 3px, transparent 4px);
  background-size: 38px 38px, 52px 52px;
}
</style>
