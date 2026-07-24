<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type {
  HistoricalPlayerInfo,
  JournalCardPlacement,
  JournalPageDefinition,
} from '@/features/journals/types'

interface Props {
  page: JournalPageDefinition
  eraTitle: string
  eraSubtitle?: string
  players: Record<string, HistoricalPlayerInfo>
}

defineProps<Props>()
const emit = defineEmits<{
  select: [player: HistoricalPlayerInfo]
}>()
const { t } = useI18n()

const positionClass = (placement: JournalCardPlacement): string => {
  const classes: Record<JournalCardPlacement['position'], string> = {
    top: 'left-[39%] top-[14%]',
    'bottom-left': 'left-[22%] top-[56%]',
    'bottom-right': 'right-[22%] top-[56%]',
  }
  return classes[placement.position]
}
</script>

<template>
  <div class="absolute inset-0 text-[#173b35]" :data-journal-page="page.id">
    <header class="absolute inset-x-[8%] top-[4.5%] text-center">
      <p class="text-[clamp(0.34rem,0.75vw,0.72rem)] font-black uppercase tracking-[0.2em]">
        {{ eraTitle }}
      </p>
      <p
        v-if="eraSubtitle"
        class="mt-[1%] truncate text-[clamp(0.28rem,0.55vw,0.58rem)] font-semibold text-[#173b35]/65"
      >
        {{ eraSubtitle }}
      </p>
    </header>

    <!-- Позиция карточки целиком определяется декларативной конфигурацией страницы. -->
    <button
      v-for="placement in page.cards"
      :key="placement.cardId"
      class="group absolute aspect-[2/3] w-[22%] overflow-hidden rounded-[clamp(2px,0.35vw,7px)] border border-[#725f3e]/45 bg-[#f2ead5] text-left shadow-[0_5px_12px_rgb(17_45_40/0.25)] outline-none transition duration-200 hover:-translate-y-[2%] hover:shadow-[0_8px_16px_rgb(17_45_40/0.34)] focus-visible:ring-2 focus-visible:ring-[#9b7136] focus-visible:ring-offset-2 focus-visible:ring-offset-[#d7d0bc]"
      :class="positionClass(placement)"
      type="button"
      :data-card-position="placement.position"
      :data-historical-card="placement.cardId"
      :aria-label="
        t('album.history.openPlayer', {
          name: players[placement.cardId]?.shortName ?? placement.cardId,
        })
      "
      @click="players[placement.cardId] && emit('select', players[placement.cardId])"
    >
      <img
        class="h-[68%] w-full object-cover sepia-[0.18] transition duration-300 group-hover:scale-[1.025]"
        :src="players[placement.cardId]?.image"
        :alt="players[placement.cardId]?.shortName"
      />
      <span class="flex h-[32%] flex-col justify-between px-[7%] py-[5%]">
        <strong class="truncate text-[clamp(0.34rem,0.64vw,0.66rem)] leading-tight">
          {{ players[placement.cardId]?.shortName }}
        </strong>
        <span
          class="inline-flex w-fit items-center gap-1 rounded-full bg-[#173b35] px-[6%] py-[2%] text-[clamp(0.23rem,0.4vw,0.43rem)] font-black uppercase tracking-wide text-[#f2ead5]"
        >
          <i class="pi pi-check-circle" aria-hidden="true" />
          {{ t('album.history.placed') }}
        </span>
      </span>
    </button>

    <span
      class="absolute bottom-[3%] rounded-full border border-[#173b35]/15 bg-[#f2ead5]/90 px-[2.5%] py-[1%] text-[clamp(0.3rem,0.55vw,0.58rem)] font-black shadow-sm"
      :class="page.id.endsWith('-left') ? 'left-[5%]' : 'right-[5%]'"
      aria-hidden="true"
    >
      {{ page.id.endsWith('-left') ? t('album.history.leftPage') : t('album.history.rightPage') }}
    </span>
  </div>
</template>
