<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ALBUM_VIEW_CONFIG } from '@/data/mainConst'
import { getJournalById } from '@/features/journals/registry'
import type {
  HistoricalJournalDefinition,
  HistoricalPlayerInfo,
  JournalPageDefinition,
  JournalSpreadDefinition,
} from '@/features/journals/types'
import { useJournalsStore } from '@/stores/journals'

import AlbumBook from '@/components/Album/AlbumBook.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import HistoricalJournalPage from '@/components/Album/HistoricalJournalPage.vue'
import StickerPreviewDialog from '@/components/Sticker/StickerPreviewDialog.vue'

interface HistoricalAlbumPage extends AlbumPageData {
  definition: JournalPageDefinition
  spread: JournalSpreadDefinition
}

const { t } = useI18n()
const router = useRouter()
const journalsStore = useJournalsStore()
const journal = getJournalById('tomsk-football-history') as HistoricalJournalDefinition
const currentPage: Ref<number> = ref(0)
const isDesktopSpread: Ref<boolean> = ref(false)
const isProgressLoaded: Ref<boolean> = ref(false)
const selectedPlayer: Ref<HistoricalPlayerInfo | undefined> = ref(undefined)
const isPreviewOpen: Ref<boolean> = ref(false)
let desktopMediaQuery: MediaQueryList | undefined

const pages: HistoricalAlbumPage[] = journal.spreads.flatMap(
  (spread: JournalSpreadDefinition): HistoricalAlbumPage[] => [
    {
      id: spread.leftPage.id,
      title: `${spread.title} · ${t('album.history.leftPage')}`,
      image: '/journals/tomsk-football-history/page-background.svg',
      definition: spread.leftPage,
      spread,
    },
    {
      id: spread.rightPage.id,
      title: `${spread.title} · ${t('album.history.rightPage')}`,
      image: '/journals/tomsk-football-history/page-background.svg',
      definition: spread.rightPage,
      spread,
    },
  ],
)

const displayMode: ComputedRef<'spread' | 'page'> = computed(() =>
  isDesktopSpread.value ? 'spread' : 'page',
)
const pageStep: ComputedRef<number> = computed(() => (isDesktopSpread.value ? 2 : 1))
const currentSpreadIndex: ComputedRef<number> = computed(() =>
  Math.min(journal.spreads.length - 1, Math.floor(currentPage.value / 2)),
)
const currentSpread: ComputedRef<JournalSpreadDefinition> = computed(
  () => journal.spreads[currentSpreadIndex.value],
)

const normalizePage = (page: number): number => {
  const clamped: number = Math.max(0, Math.min(pages.length - 1, page))
  return isDesktopSpread.value ? Math.floor(clamped / 2) * 2 : clamped
}

const syncDesktopSpread = (event: MediaQueryList | MediaQueryListEvent): void => {
  isDesktopSpread.value = event.matches
  currentPage.value = normalizePage(currentPage.value)
}

const previousPage = (): void => {
  currentPage.value = Math.max(0, currentPage.value - pageStep.value)
}

const nextPage = (): void => {
  currentPage.value = Math.min(pages.length - pageStep.value, currentPage.value + pageStep.value)
}

const closeBook = (): void => {
  void router.push('/album')
}

const openPlayer = (player: HistoricalPlayerInfo): void => {
  selectedPlayer.value = player
  isPreviewOpen.value = true
  void journalsStore.markPlayerViewed(journal.id, player.playerId)
}

const handleFlip = (isFlipped: boolean): void => {
  if (!isFlipped || !selectedPlayer.value) return
  void journalsStore.markPlayerBackOpened(journal.id, selectedPlayer.value.playerId)
}

watch(currentPage, (page: number): void => {
  if (isProgressLoaded.value) void journalsStore.setLastPage(journal.id, page)
})

onMounted(async (): Promise<void> => {
  desktopMediaQuery = window.matchMedia(ALBUM_VIEW_CONFIG.desktopSpreadMediaQuery)
  syncDesktopSpread(desktopMediaQuery)
  desktopMediaQuery.addEventListener('change', syncDesktopSpread)
  const progress = await journalsStore.loadJournal(journal.id)
  currentPage.value = normalizePage(progress.lastPage)
  isProgressLoaded.value = true
})

onBeforeUnmount((): void => {
  desktopMediaQuery?.removeEventListener('change', syncDesktopSpread)
})
</script>

<template>
  <section
    class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#102d2a]"
    data-historical-journal
  >
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-[#f1e6ca]/15 px-4 text-[#f5edda] max-md:h-12 max-md:px-3"
    >
      <div class="min-w-0 pr-3">
        <p
          class="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[#d6b36f] max-md:text-[0.48rem]"
        >
          {{ t(journal.titleKey) }}
        </p>
        <h1 class="truncate text-lg font-black leading-tight max-md:text-[0.78rem]">
          {{ currentSpread.title }}
        </h1>
      </div>
      <div class="shrink-0 text-right text-[10px] font-semibold text-[#f5edda]/65">
        <strong class="block text-base font-black text-[#f5edda] max-md:text-xs">
          {{ currentSpreadIndex + 1 }} / {{ journal.spreads.length }}
        </strong>
        {{ t('album.history.eraProgress') }}
      </div>
    </header>

    <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <AlbumBook
        class="h-full min-h-0 w-full"
        :pages="pages"
        :current-page="currentPage"
        :is-open="true"
        :display-mode="displayMode"
        @open="currentPage = 0"
        @close="closeBook"
        @previous="previousPage"
        @next="nextPage"
      >
        <template #default="{ pageIndex }">
          <HistoricalJournalPage
            :page="pages[pageIndex].definition"
            :era-title="pages[pageIndex].spread.title"
            :era-subtitle="pages[pageIndex].spread.subtitle"
            :players="journal.players"
            @select="openPlayer"
          />
        </template>
      </AlbumBook>
    </div>

    <StickerPreviewDialog
      v-model:visible="isPreviewOpen"
      :historical-player="selectedPlayer"
      :read-only="true"
      @flipped="handleFlip"
    />
  </section>
</template>
