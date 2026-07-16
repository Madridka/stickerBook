<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import StickerSlot, { type StickerSlotData } from '@/components/Album/StickerSlot.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import cardsData from '@/data/wc-26/mexico/players.json'
import albumData from '@/data/album.json'
import { useCollectionStore } from '@/stores/collection'
import type { PlayerCard } from '@/types'

interface AlbumDataPage {
  id: string
  slots: StickerSlotData[]
}

interface AlbumPageWithSlots extends AlbumPageData {
  slots: StickerSlotData[]
}

const { t } = useI18n()
const collection = useCollectionStore()
const isOpen: Ref<boolean> = ref(false)
const currentPage: Ref<number> = ref(0)
const albumImages: Record<string, string> = import.meta.glob(
  '../../assets/game/wc-26/mexico/album/*.png',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

const pageImage = (fileName: string): string =>
  albumImages[`../../assets/game/wc-26/mexico/album/${fileName}`]

const stickerImages: Record<string, string> = import.meta.glob(
  '../assets/game/wc-26/mexico/stickers/*.png',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>
const cards: PlayerCard[] = (cardsData as PlayerCard[]).map(
  (card: PlayerCard): PlayerCard => ({
    ...card,
    image: stickerImages[`../assets/game/wc-26/mexico/stickers/${card.id}.png`] ?? card.image,
  }),
)

const slotPages: AlbumDataPage[] = albumData.pages as AlbumDataPage[]
const slotsForPage = (pageId: string): StickerSlotData[] =>
  slotPages.find(({ id }): boolean => id === pageId)?.slots ?? []

// Возвращает карточку каталога только для экземпляров, загруженных из IndexedDB
const getCollectedCard = (playerId: string): PlayerCard | undefined => {
  const isCollected: boolean = collection.items.some(
    ({ instance }): boolean => instance.playerId === playerId,
  )
  return isCollected ? cards.find(({ id }): boolean => id === playerId) : undefined
}

const pages: AlbumPageWithSlots[] = [
  { id: 'cover', image: pageImage('page-01-cover.png'), title: t('album.cover'), slots: [] },
  { id: 'info-left', image: pageImage('page-02-info-left.png'), title: t('album.info'), slots: [] },
  {
    id: 'info-right',
    image: pageImage('page-03-info-right.png'),
    title: t('album.info'),
    slots: [],
  },
  {
    id: 'stickers-left',
    image: pageImage('page-04-stickers-left.png'),
    title: t('album.page'),
    slots: slotsForPage('stickers-left'),
  },
  {
    id: 'stickers-right',
    image: pageImage('page-05-stickers-right.png'),
    title: t('album.page'),
    slots: slotsForPage('stickers-right'),
  },
  {
    id: 'stat-left',
    image: pageImage('page-06-stat-left.png'),
    title: t('album.statistics'),
    slots: [],
  },
  {
    id: 'stat-right',
    image: pageImage('page-07-stat-right.png'),
    title: t('album.statistics'),
    slots: [],
  },
  { id: 'back', image: pageImage('page-08-back.png'), title: t('album.back'), slots: [] },
]

const activePage: ComputedRef<AlbumPageWithSlots> = computed(
  (): AlbumPageWithSlots => pages[currentPage.value],
)

// Открывает альбом с первой внутренней страницы
const openAlbum = (): void => {
  isOpen.value = true
  currentPage.value = 1
}

// Возвращает пользователя к обложке альбома
const closeAlbum = (): void => {
  isOpen.value = false
  currentPage.value = 0
}

// Переключает альбом на предыдущую страницу
const previousPage = (): void => {
  if (currentPage.value > 1) currentPage.value -= 1
}

// Переключает альбом на следующую страницу
const nextPage = (): void => {
  if (currentPage.value < pages.length - 1) currentPage.value += 1
}
</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 py-1">
    <div class="w-full text-center">
      <p class="text-sm font-bold uppercase tracking-[0.18em] text-coral">
        {{ t('app.collection') }}
      </p>
      <h1 class="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{{ t('album.title') }}</h1>
    </div>

    <AlbumBook
      :pages="pages"
      :current-page="currentPage"
      :is-open="isOpen"
      @open="openAlbum"
      @close="closeAlbum"
      @previous="previousPage"
      @next="nextPage"
    >
      <StickerSlot
        v-for="slot in activePage.slots"
        :key="slot.id"
        :slot="slot"
        :card="getCollectedCard(slot.playerId)"
      />
    </AlbumBook>
  </section>
</template>
