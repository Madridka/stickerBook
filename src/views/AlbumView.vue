<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import StickerSlot, { type StickerSlotData } from '@/components/Album/StickerSlot.vue'
import StickerTray, { type StickerDrop, type StickerTrayCard } from '@/components/StickerTray.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import cardsData from '@/data/wc-26/mexico/players.json'
import albumData from '@/data/album.json'
import { useCollectionStore } from '@/stores/collection'
import type { CollectionItem, PlayerCard, StickerPlacement } from '@/types'

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
const isConfirmOpen: Ref<boolean> = ref(false)
const pendingDrop: Ref<StickerDrop | undefined> = ref(undefined)
const confirmationKind: Ref<'wrong' | 'crooked'> = ref('wrong')
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

// Возвращает карточку, которая уже вклеена в конкретную ячейку
const getPlacedCard = (slotId: string): { card: PlayerCard; placement: StickerPlacement } | undefined => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }: CollectionItem): boolean => instance.placement?.slotId === slotId,
  )
  if (!item?.instance.placement) return undefined
  const card: PlayerCard | undefined = cards.find(({ id }): boolean => id === item.instance.playerId)
  return card ? { card, placement: item.instance.placement } : undefined
}

const trayCards = computed((): StickerTrayCard[] =>
  collection.items
    .filter(({ instance }: CollectionItem): boolean => instance.location === 'collection')
    .map(({ instance }: CollectionItem): StickerTrayCard | undefined => {
      const card: PlayerCard | undefined = cards.find(({ id }): boolean => id === instance.playerId)
      return card ? { card, instance } : undefined
    })
    .filter((item: StickerTrayCard | undefined): item is StickerTrayCard => Boolean(item)),
)

// Сохраняет качество после мини-игры снятия защитного слоя
const updateQuality = async (cardId: string, quality: number): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }: CollectionItem): boolean => instance.playerId === cardId && instance.location === 'collection',
  )
  if (item) await collection.updateCard(item.instance.id, { quality })
}

// Формирует положение карточки по точке отпускания внутри ячейки
const makePlacement = (drop: StickerDrop): StickerPlacement => ({
  slotId: drop.slotId,
  x: drop.x,
  y: drop.y,
  rotation: Math.round(drop.x * 24),
})

// Сохраняет установленную карточку в альбом
const saveDrop = async (drop: StickerDrop): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }: CollectionItem): boolean => instance.playerId === drop.cardId && instance.location === 'collection',
  )
  if (!item) return
  await collection.updateCard(item.instance.id, {
    location: 'album',
    placement: makePlacement(drop),
  })
}

// Просит подтверждение перед сохранением заведомо неправильной установки
const handleDrop = (drop: StickerDrop): void => {
  const slot: StickerSlotData | undefined = activePage.value.slots.find(({ id }): boolean => id === drop.slotId)
  const isWrongSlot: boolean = slot?.playerId !== drop.cardId
  const isCrooked: boolean = Math.abs(drop.x) > 0.18 || Math.abs(drop.y) > 0.18
  if (isWrongSlot || isCrooked) {
    pendingDrop.value = drop
    confirmationKind.value = isWrongSlot ? 'wrong' : 'crooked'
    isConfirmOpen.value = true
    return
  }
  void saveDrop(drop)
}

// Подтверждает и сохраняет положение карточки, выбранное игроком
const confirmDrop = async (): Promise<void> => {
  if (!pendingDrop.value) return
  await saveDrop(pendingDrop.value)
  pendingDrop.value = undefined
  isConfirmOpen.value = false
}

const cancelDrop = (): void => {
  pendingDrop.value = undefined
  isConfirmOpen.value = false
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
        :card="getPlacedCard(slot.id)?.card"
        :placement="getPlacedCard(slot.id)?.placement"
      />
    </AlbumBook>

    <StickerTray
      v-if="isOpen && activePage.slots.length"
      :cards="trayCards"
      @ready="updateQuality"
      @drop="handleDrop"
    />

    <Dialog
      v-model:visible="isConfirmOpen"
      modal
      :header="t(`stickerTray.${confirmationKind}Title`)"
      :style="{ width: 'min(25rem, calc(100vw - 2rem))' }"
    >
      <p class="text-sm leading-relaxed text-ink/70">{{ t(`stickerTray.${confirmationKind}Text`) }}</p>
      <template #footer>
        <Button :label="t('stickerTray.cancel')" text type="button" @click="cancelDrop" />
        <Button :label="t('stickerTray.confirm')" icon="pi pi-check" type="button" @click="confirmDrop" />
      </template>
    </Dialog>
  </section>
</template>
