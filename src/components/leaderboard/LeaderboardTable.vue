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
  <!-- Горизонтальный скролл сохраняет все сравнительные колонки на узких экранах. -->
  <div
    class="overflow-x-auto border-2 border-ink bg-paper shadow-[5px_5px_0_rgb(var(--color-mint)/0.7)]"
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
</template>
