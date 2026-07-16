<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AlbumBook from '@/components/Album/AlbumBook.vue'
import AlbumDropConfirm from '@/components/DragDrop/AlbumDropConfirm.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import StickerSlot from '@/components/Album/StickerSlot.vue'
import StickerTray from '@/components/Sticker/StickerTray.vue'
import cardsData from '@/data/wc-26/mexico/players.json'
import { useAlbumStore } from '@/stores/album'
import { useCollectionStore } from '@/stores/collection'
import type {
  AlbumGeometryPage,
  CollectionItem,
  PlayerCard,
  StickerDropGrade,
  StickerDropResult,
  StickerPlacement,
  StickerTrayItem,
} from '@/types'

interface AlbumPageView extends AlbumPageData {
  geometry: AlbumGeometryPage
}

const { t } = useI18n()
const album = useAlbumStore()
const collection = useCollectionStore()
const currentPage: Ref<number> = ref(0)
const activeTargetId: Ref<string | undefined> = ref(undefined)
const pendingDrop: Ref<StickerDropResult | undefined> = ref(undefined)
const confirmationKind: Ref<'wrong' | 'far'> = ref('far')
const isConfirmOpen: Ref<boolean> = ref(false)
const lastGrade: Ref<StickerDropGrade | undefined> = ref(undefined)

const albumImages: Record<string, string> = import.meta.glob(
  '../../assets/game/wc-26/mexico/album/*.png',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>
const cards: PlayerCard[] = cardsData as PlayerCard[]

const pages: ComputedRef<AlbumPageView[]> = computed((): AlbumPageView[] =>
  album.pages.map((page: AlbumGeometryPage): AlbumPageView => ({
    id: page.id,
    title: t('album.spreadTitle', { page: String(page.number).padStart(2, '0') }),
    image: albumImages[`../../assets/game/wc-26/mexico/album/${page.image}`],
    geometry: page,
  })),
)

const visibleGeometry: ComputedRef<AlbumGeometryPage> = computed(
  (): AlbumGeometryPage => pages.value[currentPage.value].geometry,
)
const placedOnPage: ComputedRef<number> = computed((): number =>
  visibleGeometry.value.slots.filter(({ id }): boolean => Boolean(getPlacedCard(id))).length,
)

const normalizeSlotId = (slotId: string): string => slotId.replace(/-slot$/, '')
const getCard = (playerId: string): PlayerCard | undefined =>
  cards.find(({ id }): boolean => id === playerId)

// Возвращает уже вклеенную карточку с поддержкой старых идентификаторов слотов.
const getPlacedCard = (slotId: string): { card: PlayerCard; placement: StickerPlacement } | undefined => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => normalizeSlotId(instance.placement?.slotId ?? '') === slotId,
  )
  if (!item?.instance.placement) return undefined
  const card: PlayerCard | undefined = getCard(item.instance.playerId)
  return card ? { card, placement: item.instance.placement } : undefined
}

const trayCards: ComputedRef<StickerTrayItem[]> = computed((): StickerTrayItem[] =>
  collection.items
    .filter(({ instance }): boolean => ['inventory', 'collection'].includes(instance.location))
    .map(({ instance }): StickerTrayItem | undefined => {
      const card: PlayerCard | undefined = getCard(instance.playerId)
      return card ? { card, instance } : undefined
    })
    .filter((item: StickerTrayItem | undefined): item is StickerTrayItem => Boolean(item)),
)

// Открывает страницу выбранного игрока и подсвечивает единственную подходящую ячейку.
const focusCardTarget = (playerId: string): void => {
  const pageIndex: number = pages.value.findIndex(({ geometry }): boolean =>
    geometry.slots.some((slot): boolean => slot.playerId === playerId),
  )
  if (pageIndex >= 0) currentPage.value = pageIndex
  activeTargetId.value = playerId
}

const updatePreparationQuality = async (instanceId: string, quality: number): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === instanceId,
  )
  if (item) await collection.updateCard(instanceId, { quality: Math.min(item.instance.quality, quality) })
}

// Сохраняет точность позиции и итоговое качество конкретного экземпляра наклейки.
const saveDrop = async (drop: StickerDropResult): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === drop.instanceId,
  )
  if (!item) return
  const placement: StickerPlacement = {
    slotId: drop.slotId,
    x: drop.x,
    y: drop.y,
    rotation: drop.grade === 'perfect' ? 0 : Math.round(Math.max(-0.45, Math.min(0.45, drop.x)) * 18),
    accuracy: drop.accuracy,
  }
  await collection.updateCard(drop.instanceId, {
    quality: Math.min(item.instance.quality, drop.quality),
    location: 'album',
    placement,
  })
  activeTargetId.value = undefined
  lastGrade.value = drop.grade
}

// Проверяет попадание в слот и запрашивает подтверждение намеренно плохой вклейки.
const handleDrop = (drop: StickerDropResult): void => {
  const slot = album.geometry.getSlot(drop.slotId)
  const isWrongSlot: boolean = slot?.playerId !== drop.playerId
  if (isWrongSlot || drop.grade === 'far') {
    pendingDrop.value = drop
    confirmationKind.value = isWrongSlot ? 'wrong' : 'far'
    isConfirmOpen.value = true
    return
  }
  void saveDrop(drop)
}

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
</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-ink">
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-paper/10 px-4 text-paper">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">{{ t('app.album') }}</p>
        <h1 class="text-lg font-black leading-tight">
          {{ t('album.spreadTitle', { page: String(visibleGeometry.number).padStart(2, '0') }) }}
        </h1>
      </div>
      <div class="text-right text-xs font-semibold text-paper/65">
        <strong class="block text-base font-black text-paper">{{ placedOnPage }} / {{ visibleGeometry.slots.length }}</strong>
        {{ t('album.spreadProgress', { placed: placedOnPage, total: visibleGeometry.slots.length }) }}
      </div>
    </header>

    <div class="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 lg:p-3">
        <AlbumBook
          class="h-full min-h-0 w-full"
          :pages="pages"
          :current-page="currentPage"
          :is-open="true"
          display-mode="page"
          @previous="currentPage = Math.max(0, currentPage - 1)"
          @next="currentPage = Math.min(pages.length - 1, currentPage + 1)"
        >
          <template #default="{ pageIndex }">
            <StickerSlot
              v-for="slot in pages[pageIndex].geometry.slots"
              :key="slot.id"
              :slot="slot"
              :page="pages[pageIndex].geometry"
              :target-card="getCard(slot.playerId)"
              :card="getPlacedCard(slot.id)?.card"
              :placement="getPlacedCard(slot.id)?.placement"
              :highlighted="activeTargetId === slot.playerId"
            />
          </template>
        </AlbumBook>

        <p
          v-if="lastGrade"
          class="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded bg-mint px-3 py-1 text-xs font-bold text-ink shadow"
          aria-live="polite"
        >
          {{ t(`stickerTray.result.${lastGrade}`) }}
        </p>
      </div>

      <StickerTray
        :cards="trayCards"
        @focus="focusCardTarget"
        @ready="updatePreparationQuality"
        @drop="handleDrop"
      />
    </div>

    <AlbumDropConfirm
      v-model:visible="isConfirmOpen"
      :kind="confirmationKind"
      @confirm="confirmDrop"
      @cancel="cancelDrop"
    />
  </section>
</template>
