<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable, { type DataTableRowClickEvent } from 'primevue/datatable'
import { LEADERBOARD_CONFIG } from '@/config/gameBalance'
import type { LeaderboardPlayer } from '@/types/leaderboard'

interface LeaderboardTableProps {
  players: LeaderboardPlayer[]
}

defineProps<LeaderboardTableProps>()
const emit = defineEmits<{
  select: [player: LeaderboardPlayer]
}>()
const { t, locale } = useI18n()
const numberFormatter = computed(
  (): Intl.NumberFormat => new Intl.NumberFormat(locale.value),
)
const albumIds = LEADERBOARD_CONFIG.albumIds

const formatNumber = (value: number): string => numberFormatter.value.format(value)
const rankTone = (position: number): string => {
  if (position === 1) return 'bg-gold/70'
  if (position === 2) return 'bg-ink/10'
  if (position === 3) return 'bg-coral/20'
  return 'bg-paper'
}
const rowClass = (): string =>
  'group cursor-pointer border-b border-ink/10 transition-colors hover:bg-gold/15'
const selectPlayer = (player: LeaderboardPlayer): void => emit('select', player)
const handleRowClick = (event: DataTableRowClickEvent<LeaderboardPlayer>): void => {
  selectPlayer(event.data)
}
</script>

<template>
  <div>
    <!-- На мобильном каждый игрок показан отдельной карточкой без горизонтального скролла. -->
    <div class="grid gap-3 md:hidden">
      <button
        v-for="player in players"
        :key="player.userId"
        type="button"
        class="group block w-full border-2 border-ink/15 bg-paper p-3 text-left shadow-[4px_4px_0_rgb(var(--color-mint)/0.45)] transition hover:border-ink hover:shadow-[4px_4px_0_rgb(var(--color-gold)/0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        :aria-label="t('leaderboard.openProfile', { name: player.username })"
        @click="selectPlayer(player)"
      >
        <span class="flex items-center gap-3">
          <span
            class="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink font-black tabular-nums"
            :class="rankTone(player.position)"
          >
            {{ player.position }}
          </span>

          <span class="min-w-0 flex-1">
            <strong class="block truncate text-base font-black group-hover:text-coral">
              {{ player.username }}
            </strong>
            <span class="mt-0.5 flex items-baseline gap-1.5 text-xs text-ink/55">
              <strong class="text-base font-black tabular-nums text-ink">
                {{ formatNumber(player.totalCards) }}
              </strong>
              {{ t('leaderboard.columns.total') }}
            </span>
          </span>

          <i class="pi pi-chevron-right text-sm text-coral" aria-hidden="true" />
        </span>

        <!-- Повторяет компактную сетку статистики из профиля игрока. -->
        <span class="mt-3 grid grid-cols-2 gap-2 border-t border-ink/10 pt-3">
          <span
            v-for="albumId in albumIds"
            :key="albumId"
            class="flex min-w-0 items-center justify-between gap-2 border border-ink/15 bg-mint/10 px-2.5 py-2"
          >
            <span class="truncate text-[11px] font-semibold text-ink/60">
              {{ t(`leaderboard.albumNames.${albumId}`) }}
            </span>
            <strong class="shrink-0 text-sm font-black tabular-nums text-ink">
              {{ formatNumber(player.albums[albumId]) }}
            </strong>
          </span>
        </span>
      </button>
    </div>

    <div
      class="hidden overflow-x-auto border-2 border-ink bg-paper shadow-[5px_5px_0_rgb(var(--color-mint)/0.7)] md:block"
    >
      <DataTable
        class="leaderboard-table"
        table-class="min-w-[58rem]"
        data-key="userId"
        :value="players"
        :row-class="rowClass"
        @row-click="handleRowClick"
      >
        <Column
          :header="t('leaderboard.columns.position')"
          header-class="!bg-ink !px-4 !py-3 !text-center !text-[11px] !uppercase !tracking-wider !text-paper"
          body-class="!px-4 !py-3 !text-center"
        >
          <template #body="{ data }">
            <span
              class="inline-grid h-9 w-9 place-items-center rounded-full border-2 border-ink font-black tabular-nums group-hover:bg-gold/30"
              :class="rankTone(data.position)"
            >
              {{ data.position }}
            </span>
          </template>
        </Column>
        <Column
          field="username"
          :header="t('leaderboard.columns.player')"
          header-class="!bg-ink !px-4 !py-3 !text-[11px] !uppercase !tracking-wider !text-paper"
          body-class="!px-4 !py-3"
        >
          <template #body="{ data }">
            <Button
              link
              class="!border-0 !bg-transparent !p-0 !font-black !text-ink hover:!bg-transparent hover:!text-coral"
              icon="pi pi-chevron-right"
              icon-pos="right"
              :label="data.username"
              :aria-label="t('leaderboard.openProfile', { name: data.username })"
              @click.stop="selectPlayer(data)"
            />
          </template>
        </Column>
        <Column
          field="totalCards"
          :header="t('leaderboard.columns.total')"
          header-class="!bg-ink !px-4 !py-3 !text-right !text-[11px] !uppercase !tracking-wider !text-paper"
          body-class="!px-4 !py-3 !text-right !text-base !font-black !tabular-nums"
        >
          <template #body="{ data }">{{ formatNumber(data.totalCards) }}</template>
        </Column>
        <Column
          v-for="albumId in albumIds"
          :key="albumId"
          :header="t(`leaderboard.albumNames.${albumId}`)"
          header-class="!bg-ink !px-4 !py-3 !text-right !text-[11px] !uppercase !tracking-wider !text-paper"
          body-class="!px-4 !py-3 !text-right !font-bold !tabular-nums"
        >
          <template #body="{ data }">
            {{ formatNumber(data.albums[albumId]) }}
          </template>
        </Column>
      </DataTable>
      <p class="border-t border-ink/10 bg-mint/10 px-4 py-2 text-xs font-semibold text-ink/55">
        <i class="pi pi-info-circle mr-1" aria-hidden="true" />
        {{ t('leaderboard.profileHint') }}
      </p>
    </div>

    <p class="mt-3 text-xs font-semibold text-ink/55 md:hidden">
      <i class="pi pi-info-circle mr-1" aria-hidden="true" />
      {{ t('leaderboard.profileHint') }}
    </p>
  </div>
</template>
