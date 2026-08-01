<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  type ComputedRef,
  type Ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import changelogMarkdown from '@/change-log/CHANGELOG.md?raw'
import {
  ALBUM_VIEW_CONFIG,
  BLISTER_CONFIGS,
  PLACE_ALL_COLLECTED_CARDS,
} from '@/data/mainConst'
import { getAlbumById, getPlayerAlbumById, requireAlbum } from '@/data/albumRegistry'
import { useAlbumStore } from '@/stores/album'
import { useCollectionStore } from '@/stores/collection'
import { useDeletedCardsStore } from '@/stores/deletedCards'
import type {
  AlbumContentsItem,
  AlbumDefinition,
  AlbumEditorialPageDefinition,
  AlbumGeometryPage,
  CollectionItem,
  CardDefinition,
  StickerDropResult,
  StickerPlacement,
  StickerPreparation,
  StickerInstance,
  StickerTrayItem,
} from '@/types'

import AlbumBook from '@/components/Album/AlbumBook.vue'
import AlbumContentsPage from '@/components/Album/AlbumContentsPage.vue'
import AlbumEditorialPage from '@/components/Album/AlbumEditorialPage.vue'
import AlbumDropConfirm from '@/components/DragDrop/AlbumDropConfirm.vue'
import type { AlbumPageData } from '@/components/Album/AlbumPage.vue'
import StickerSlot from '@/components/Album/StickerSlot.vue'
import StickerTray from '@/components/Sticker/StickerTray.vue'
import StickerPreviewDialog from '@/components/Sticker/StickerPreviewDialog.vue'
import { resolveStickerPlacement } from '@/components/DragDrop/dropGeometry'

interface AlbumPageView extends AlbumPageData {
  geometry: AlbumGeometryPage
}

interface AlbumReleaseNote {
  version: string
  title: string
  items: string[]
}

const toPlainText = (value: string): string =>
  value
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim()

const parseReleaseNotes = (markdown: string): AlbumReleaseNote[] => {
  const headings: RegExpMatchArray[] = Array.from(
    markdown.matchAll(/^##\s+(\d+\.\d+\.\d+)\s+—\s+(.+)$/gm),
  )
  return headings.map((heading: RegExpMatchArray, index: number): AlbumReleaseNote => {
    const contentStart: number = (heading.index ?? 0) + heading[0].length
    const contentEnd: number = headings[index + 1]?.index ?? markdown.length
    const items: string[] = markdown
      .slice(contentStart, contentEnd)
      .split(/\r?\n/)
      .filter((line: string): boolean => /^-\s+/.test(line))
      .map((line: string): string => toPlainText(line.replace(/^-\s+/, '')))
    return { version: heading[1], title: toPlainText(heading[2]), items }
  })
}

const allReleaseNotes: AlbumReleaseNote[] = parseReleaseNotes(changelogMarkdown)
const latestReleaseSeries: string =
  allReleaseNotes[0]?.version.split('.').slice(0, 2).join('.') ?? '0.0'
const currentSeriesReleaseNotes: AlbumReleaseNote[] = allReleaseNotes.filter(
  ({ version }: AlbumReleaseNote): boolean => version.startsWith(`${latestReleaseSeries}.`),
)
const recentReleaseNotes: AlbumReleaseNote[] = [
  ...currentSeriesReleaseNotes,
  ...allReleaseNotes.filter(
    ({ version }: AlbumReleaseNote): boolean => !version.startsWith(`${latestReleaseSeries}.`),
  ),
].slice(0, ALBUM_VIEW_CONFIG.recentReleaseCount)

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const album = useAlbumStore()
const requestedAlbumId: string =
  typeof route.params.albumId === 'string'
    ? route.params.albumId
    : typeof route.meta.developmentAlbumId === 'string'
      ? route.meta.developmentAlbumId
    : BLISTER_CONFIGS.standard.albumId
const isDevelopmentAlbumRoute: boolean =
  route.meta.developmentAlbumId === requestedAlbumId
const requestedAlbumDefinition: AlbumDefinition | undefined = isDevelopmentAlbumRoute
  ? getAlbumById(requestedAlbumId)
  : getPlayerAlbumById(requestedAlbumId)
const albumDefinition: AlbumDefinition =
  requestedAlbumDefinition ?? requireAlbum(BLISTER_CONFIGS.standard.albumId)
album.selectAlbum(albumDefinition.id)
const cards: CardDefinition[] = albumDefinition.cards
const albumContentsTeams: AlbumContentsItem[] = albumDefinition.contents
const editorialPages: Record<string, AlbumEditorialPageDefinition> = Object.fromEntries(
  albumDefinition.editorialPages.map(
    (page): [string, AlbumEditorialPageDefinition] => [page.pageId, page],
  ),
)
const contentsPageSize: number =
  albumDefinition.layout.contentsPageSize ?? ALBUM_VIEW_CONFIG.contentsPageSize
const contentsFirstPage: number =
  albumDefinition.layout.contentsFirstPage ?? Number.MAX_SAFE_INTEGER
const contentsLastPage: number =
  albumDefinition.layout.contentsLastPage ?? Number.MIN_SAFE_INTEGER
const collection = useCollectionStore()
const deletedCards = useDeletedCardsStore()
const currentPage: Ref<number> = ref(0)
const isBookOpen: Ref<boolean> = ref(true)
const isDesktopSpread: Ref<boolean> = ref(false)
const activeTargetId: Ref<string | undefined> = ref(undefined)
const pendingDrop: Ref<StickerDropResult | undefined> = ref(undefined)
const confirmationKind: Ref<'wrong' | 'far'> = ref('far')
const isConfirmOpen: Ref<boolean> = ref(false)
const previewItem: Ref<StickerTrayItem | undefined> = ref(undefined)
const isPreviewOpen: Ref<boolean> = ref(false)
const prioritizedTrayInstanceId: Ref<string | undefined> = ref(undefined)
const focusedTrayInstanceId: Ref<string | undefined> = ref(undefined)
const isTrayPageFiltered: Ref<boolean> = ref(false)
const autoPrepareInstanceId: ComputedRef<string | undefined> = computed((): string | undefined =>
  route.query.action === 'prepare' && typeof route.query.instance === 'string'
    ? route.query.instance
    : undefined,
)
let desktopMediaQuery: MediaQueryList | undefined
let trayFocusTimer: number | undefined
let collectionTargetFocusTimer: number | undefined

const albumImages: Record<string, string> = import.meta.glob(
  [
    '../../assets/game/*/main/album/**/*.webp',
    '../../assets/game/*/main/album/**/*.png',
  ],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

const pages: ComputedRef<AlbumPageView[]> = computed((): AlbumPageView[] =>
  album.pages.map(
    (page: AlbumGeometryPage): AlbumPageView => ({
      id: page.id,
      title: t('album.spreadTitle', {
        album: t(albumDefinition.name),
        page: String(page.number).padStart(2, '0'),
      }),
      image:
        albumImages[
          `../../assets/game/${albumDefinition.id}/main/album/${page.image}`
        ] ?? '',
      geometry: page,
    }),
  ),
)

const displayMode: ComputedRef<'spread' | 'page'> = computed((): 'spread' | 'page' =>
  isDesktopSpread.value ? 'spread' : 'page',
)
const isDesktopSpreadVisible: ComputedRef<boolean> = computed(
  (): boolean =>
    isDesktopSpread.value && currentPage.value >= albumDefinition.layout.openStartPage,
)
const pageStep: ComputedRef<number> = computed((): number => (isDesktopSpread.value ? 2 : 1))
const visiblePageIndexes: ComputedRef<number[]> = computed((): number[] =>
  Array.from(
    { length: isDesktopSpreadVisible.value ? pageStep.value : 1 },
    (_value: unknown, offset: number): number => currentPage.value + offset,
  ).filter((pageIndex: number): boolean => pageIndex < pages.value.length),
)
const visibleGeometries: ComputedRef<AlbumGeometryPage[]> = computed((): AlbumGeometryPage[] =>
  visiblePageIndexes.value.map(
    (pageIndex: number): AlbumGeometryPage => pages.value[pageIndex].geometry,
  ),
)
const isTeamPageVisible: ComputedRef<boolean> = computed((): boolean =>
  albumContentsTeams.length > 0 &&
  visibleGeometries.value.some(({ slots }: AlbumGeometryPage): boolean => slots.length > 0),
)
const visiblePageLabel: ComputedRef<string> = computed((): string =>
  visibleGeometries.value.map(({ number }): string => String(number).padStart(2, '0')).join('–'),
)
const visiblePageTypeLabel: ComputedRef<string> = computed((): string => {
  const visibleEditorialPages: AlbumEditorialPageDefinition[] = visibleGeometries.value.flatMap(
    ({ id }): AlbumEditorialPageDefinition[] =>
      editorialPages[id] ? [editorialPages[id]] : [],
  )
  if (visibleEditorialPages.some(({ kind }) => kind === 'cover')) {
    return t('album.editorial.coverLabel')
  }
  const isContents: boolean = visibleGeometries.value.some(
    ({ number }: AlbumGeometryPage): boolean =>
      number >= contentsFirstPage && number <= contentsLastPage,
  )
  return t(
    isContents
      ? 'album.contents.label'
      : visibleEditorialPages.length
        ? 'album.editorial.infoLabel'
        : 'album.page',
  )
})
const visibleSlotTotal: ComputedRef<number> = computed((): number =>
  visibleGeometries.value.reduce(
    (total: number, page: AlbumGeometryPage): number => total + page.slots.length,
    0,
  ),
)
const placedOnVisiblePages: ComputedRef<number> = computed((): number =>
  visibleGeometries.value.reduce(
    (total: number, page: AlbumGeometryPage): number =>
      total + page.slots.filter(({ id }): boolean => Boolean(getPlacedCard(id))).length,
    0,
  ),
)
const normalizeSlotId = (slotId: string): string => slotId.replace(/-slot$/, '')
const getCard = (playerId: string): CardDefinition | undefined =>
  cards.find(({ id }): boolean => id === playerId)
const getCardAlbumSlotId = (playerId: string): string => getCard(playerId)?.baseCardId ?? playerId
const selectedCatalogCardIds: Ref<Record<string, string>> = ref({})

type PlacedCard = {
  card: CardDefinition
  instance: StickerInstance
  placement: StickerPlacement
  preparation?: StickerPreparation
}

// Полный каталог для демонстрационного режима не зависит от сохранённой коллекции пользователя.
const catalogCardsByAlbumSlot: ReadonlyMap<string, PlacedCard[]> = cards.reduce(
  (slots: Map<string, PlacedCard[]>, card: CardDefinition): Map<string, PlacedCard[]> => {
    const slotId: string = card.baseCardId ?? card.id
    const placedCard: PlacedCard = {
      card,
      instance: {
        id: `catalog:${card.id}`,
        albumId: albumDefinition.id,
        playerId: card.id,
        quality: 100,
        location: 'album',
      },
      placement: { slotId, x: 0, y: 0, rotation: 0 },
    }
    slots.set(slotId, [...(slots.get(slotId) ?? []), placedCard])
    return slots
  },
  new Map<string, PlacedCard[]>(),
)

// Синхронизирует режим одной страницы и полного разворота с Tailwind breakpoint lg.
const syncDesktopSpread = (event: MediaQueryList | MediaQueryListEvent): void => {
  isDesktopSpread.value = event.matches
  const openStartPage: number = albumDefinition.layout.openStartPage
  if (event.matches && currentPage.value >= openStartPage) {
    currentPage.value =
      openStartPage + Math.floor((currentPage.value - openStartPage) / 2) * 2
  }
}

// Возвращает карточки слота; в демонстрационном режиме берёт их из полного каталога игры.
const getPlacedCards = (slotId: string): PlacedCard[] => {
  if (PLACE_ALL_COLLECTED_CARDS) return catalogCardsByAlbumSlot.get(slotId) ?? []

  return collection.items
    .filter(
      ({ instance }): boolean => {
        if (instance.albumId !== albumDefinition.id || instance.location === 'deleted') return false
        return (
          instance.location === 'album' &&
          normalizeSlotId(instance.placement?.slotId ?? '') === slotId
        )
      },
    )
    .map(({ instance }): PlacedCard | undefined => {
      const card: CardDefinition | undefined = getCard(instance.playerId)
      if (!card) return undefined
      const placement: StickerPlacement | undefined = instance.placement
      return placement
        ? {
            card,
            instance,
            placement,
            preparation: instance.preparation,
          }
        : undefined
    })
    .filter((item: PlacedCard | undefined): item is PlacedCard => Boolean(item))
}

const getPlacedCard = (slotId: string): PlacedCard | undefined => {
  const placedCards: PlacedCard[] = getPlacedCards(slotId)
  if (PLACE_ALL_COLLECTED_CARDS) {
    const selectedCardId: string | undefined = selectedCatalogCardIds.value[slotId]
    return placedCards.find(({ card }): boolean => card.id === selectedCardId) ?? placedCards[0]
  }
  return (
    placedCards.find(({ instance }): boolean => instance.isAlbumDisplay === true) ?? placedCards[0]
  )
}

const showNextPlacedCard = async (slotId: string): Promise<void> => {
  const placedCards: PlacedCard[] = getPlacedCards(slotId)
  if (placedCards.length < 2) return
  const current: PlacedCard | undefined = getPlacedCard(slotId)
  const currentIndex: number = placedCards.findIndex(
    ({ instance }): boolean => instance.id === current?.instance.id,
  )
  const next: PlacedCard = placedCards[(currentIndex + 1) % placedCards.length]
  if (PLACE_ALL_COLLECTED_CARDS) {
    selectedCatalogCardIds.value = {
      ...selectedCatalogCardIds.value,
      [slotId]: next.card.id,
    }
    return
  }
  await collection.setAlbumDisplay(next.instance.id, slotId)
}

const trayCards: ComputedRef<StickerTrayItem[]> = computed((): StickerTrayItem[] => {
  if (PLACE_ALL_COLLECTED_CARDS) return []
  const visiblePlayerIds: Set<string> = new Set(
    visibleGeometries.value.flatMap(({ slots }: AlbumGeometryPage): string[] =>
      slots.map(({ playerId }): string => playerId),
    ),
  )
  const items: StickerTrayItem[] = collection.items
    .filter(
      ({ instance }): boolean =>
        instance.albumId === albumDefinition.id &&
        ['inventory', 'collection'].includes(instance.location),
    )
    .map(({ instance }): StickerTrayItem | undefined => {
      const card: CardDefinition | undefined = getCard(instance.playerId)
      return card ? { card, instance } : undefined
    })
    .filter((item: StickerTrayItem | undefined): item is StickerTrayItem => Boolean(item))
    .filter(
      ({ card }: StickerTrayItem): boolean =>
        !isTrayPageFiltered.value || visiblePlayerIds.has(card.baseCardId ?? card.id),
    )

  const focusedIndex: number = items.findIndex(
    ({ instance }: StickerTrayItem): boolean => instance.id === prioritizedTrayInstanceId.value,
  )
  if (focusedIndex <= 0) return items
  return [items[focusedIndex], ...items.slice(0, focusedIndex), ...items.slice(focusedIndex + 1)]
})

const openPreview = (instance: StickerInstance): void => {
  const card: CardDefinition | undefined = getCard(instance.playerId)
  if (!card) return
  previewItem.value = { card, instance }
  isPreviewOpen.value = true
}

const removeCard = async (instanceId: string): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === instanceId,
  )
  if (!item) return
  await deletedCards.removeCard(item.instance)
  await collection.load()
}

// Открывает страницу выбранного игрока и подсвечивает единственную подходящую ячейку.
const focusCardTarget = (playerId: string): void => {
  if (collectionTargetFocusTimer !== undefined) {
    window.clearTimeout(collectionTargetFocusTimer)
    collectionTargetFocusTimer = undefined
  }
  const albumSlotId: string = getCardAlbumSlotId(playerId)
  const pageIndex: number = pages.value.findIndex(({ geometry }): boolean =>
    geometry.slots.some((slot): boolean => slot.playerId === albumSlotId),
  )
  if (pageIndex >= 0) {
    isBookOpen.value = true
    const openStartPage: number = albumDefinition.layout.openStartPage
    currentPage.value = isDesktopSpread.value
      ? openStartPage + Math.floor((pageIndex - openStartPage) / 2) * 2
      : pageIndex
  }
  activeTargetId.value = albumSlotId
}

const clearCardTarget = (): void => {
  if (collectionTargetFocusTimer !== undefined) {
    window.clearTimeout(collectionTargetFocusTimer)
    collectionTargetFocusTimer = undefined
  }
  activeTargetId.value = undefined
}

// Применяет точную ссылку из коллекции: открывает страницу и временно выделяет карточку в трее.
const applyCollectionCardLink = (): void => {
  const playerId: unknown = route.query.card
  const instanceId: unknown = route.query.instance
  if (typeof playerId !== 'string') return

  focusCardTarget(playerId)
  const targetId: string = getCardAlbumSlotId(playerId)
  collectionTargetFocusTimer = window.setTimeout((): void => {
    if (activeTargetId.value === targetId) activeTargetId.value = undefined
    collectionTargetFocusTimer = undefined
  }, ALBUM_VIEW_CONFIG.collectionTargetFocusDurationMs)
  if (typeof instanceId !== 'string') return

  prioritizedTrayInstanceId.value = instanceId
  focusedTrayInstanceId.value = instanceId
  if (trayFocusTimer !== undefined) window.clearTimeout(trayFocusTimer)
  trayFocusTimer = window.setTimeout((): void => {
    focusedTrayInstanceId.value = undefined
  }, ALBUM_VIEW_CONFIG.trayFocusDurationMs)
}

// Делает обучающий запуск подготовки одноразовым даже при возврате через историю браузера.
const clearAutoPrepareAction = (): void => {
  if (route.query.action !== 'prepare') return
  const query = { ...route.query }
  delete query.action
  void router.replace({ query })
}

const getContentsTeams = (pageNumber: number): AlbumContentsItem[] => {
  const pageOffset: number = pageNumber - contentsFirstPage
  return albumContentsTeams.slice(
    pageOffset * contentsPageSize,
    (pageOffset + 1) * contentsPageSize,
  )
}

// Переходит к первому развороту сборной, сохраняя корректную левую страницу на desktop.
const openTeam = (pageId: string): void => {
  const pageIndex: number = pages.value.findIndex(
    ({ geometry }: AlbumPageView): boolean => geometry.id === pageId,
  )
  if (pageIndex < 0) return
  activeTargetId.value = undefined
  const openStartPage: number = albumDefinition.layout.openStartPage
  currentPage.value = isDesktopSpread.value
    ? openStartPage + Math.floor((pageIndex - openStartPage) / 2) * 2
    : pageIndex
}

// Открывает выбранный в редакционном оглавлении раздел журнала.
const openEditorialPage = (pageNumber: number): void => {
  const pageIndex: number = pages.value.findIndex(
    ({ geometry }: AlbumPageView): boolean => geometry.number === pageNumber,
  )
  if (pageIndex < 0) return
  activeTargetId.value = undefined
  isBookOpen.value = true
  const openStartPage: number = albumDefinition.layout.openStartPage
  currentPage.value = isDesktopSpread.value
    ? openStartPage + Math.floor((pageIndex - openStartPage) / 2) * 2
    : pageIndex
}

// Возвращает к разделу оглавления, в котором находится текущая сборная.
const openContents = (): void => {
  const teamIndex: number = albumContentsTeams.findIndex(({ id }): boolean =>
    visibleGeometries.value.some(
      ({ id: pageId }: AlbumGeometryPage): boolean =>
        pageId === `${id}-left` || pageId === `${id}-right`,
    ),
  )
  const contentsPageNumber: number =
    contentsFirstPage + Math.floor(Math.max(teamIndex, 0) / contentsPageSize)
  const pageIndex: number = pages.value.findIndex(
    ({ geometry }: AlbumPageView): boolean => geometry.number === contentsPageNumber,
  )
  if (pageIndex < 0) return
  activeTargetId.value = undefined
  const openStartPage: number = albumDefinition.layout.openStartPage
  currentPage.value = isDesktopSpread.value
    ? openStartPage + Math.floor((pageIndex - openStartPage) / 2) * 2
    : pageIndex
}

// Переводит к целевой странице только тогда, когда текущий разворот вообще не принимает наклейки.
const prepareDropPage = (playerId: string): void => {
  if (visibleSlotTotal.value === 0) focusCardTarget(playerId)
}

const openBook = (): void => {
  currentPage.value = albumDefinition.layout.openStartPage
  isBookOpen.value = true
}

const closeBook = (): void => {
  activeTargetId.value = undefined
  void router.push('/album')
}

const previousPage = (): void => {
  const openStartPage: number = albumDefinition.layout.openStartPage
  currentPage.value =
    currentPage.value === openStartPage
      ? 0
      : Math.max(openStartPage, currentPage.value - pageStep.value)
}

const nextPage = (): void => {
  currentPage.value =
    currentPage.value < albumDefinition.layout.openStartPage
      ? albumDefinition.layout.openStartPage
      : Math.min(pages.value.length - 1, currentPage.value + pageStep.value)
}

const savePreparation = async (
  instanceId: string,
  preparation: StickerPreparation,
): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === instanceId,
  )
  if (!item) return
  const quality: number = Math.min(item.instance.quality, preparation.quality)
  await collection.updateCard(instanceId, {
    quality,
    preparation: { ...preparation, quality },
  })
}

// Сохраняет точность позиции и итоговое качество конкретного экземпляра наклейки.
const saveDrop = async (drop: StickerDropResult): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance }): boolean => instance.id === drop.instanceId,
  )
  if (!item) return
  const placement: StickerPlacement = resolveStickerPlacement(drop, item.instance.preparation)
  const dropQuality: number = drop.grade === 'far' ? drop.quality : 100
  await collection.updateCard(drop.instanceId, {
    quality: Math.min(item.instance.quality, dropQuality),
    location: 'album',
    placement,
  })
  activeTargetId.value = undefined
}

// Проверяет попадание в слот и запрашивает подтверждение намеренно плохой вклейки.
const handleDrop = (drop: StickerDropResult): void => {
  const slot = album.geometry.getSlot(drop.slotId)
  const isWrongSlot: boolean = slot?.playerId !== getCardAlbumSlotId(drop.playerId)
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

onMounted((): void => {
  if (!requestedAlbumDefinition) {
    void router.replace({ name: 'album' })
    return
  }
  desktopMediaQuery = window.matchMedia(ALBUM_VIEW_CONFIG.desktopSpreadMediaQuery)
  syncDesktopSpread(desktopMediaQuery)
  desktopMediaQuery.addEventListener('change', syncDesktopSpread)
  applyCollectionCardLink()
})

onBeforeUnmount((): void => {
  desktopMediaQuery?.removeEventListener('change', syncDesktopSpread)
  if (trayFocusTimer !== undefined) window.clearTimeout(trayFocusTimer)
  if (collectionTargetFocusTimer !== undefined) window.clearTimeout(collectionTargetFocusTimer)
})
</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-ink">
    <header
      class="flex h-14 shrink-0 items-center justify-between border-b border-paper/10 px-4 text-paper max-md:h-11 max-md:px-3"
    >
      <div>
        <p
          class="text-[10px] font-bold uppercase tracking-[0.18em] text-gold max-md:text-[0.48rem] max-md:tracking-[0.14em]"
        >
          {{ t('app.album') }}
        </p>
        <h1 class="text-lg font-black leading-tight max-md:text-[0.8rem]">
          {{
            t(isDesktopSpreadVisible ? 'album.spreadRangeTitle' : 'album.spreadTitle', {
              album: t(albumDefinition.name),
              page: visiblePageLabel,
              pages: visiblePageLabel,
            })
          }}
        </h1>
      </div>
      <div
        v-if="visibleSlotTotal > 0"
        class="text-right text-xs font-semibold text-paper/65 max-md:text-[0.52rem]"
      >
        <strong class="block text-base font-black text-paper max-md:text-xs"
          >{{ placedOnVisiblePages }} / {{ visibleSlotTotal }}</strong
        >
        {{ t('album.spreadProgress', { placed: placedOnVisiblePages, total: visibleSlotTotal }) }}
      </div>
      <div
        v-else
        class="text-right text-[10px] font-bold uppercase tracking-[0.16em] text-paper/55 max-md:text-[0.52rem]"
      >
        <strong class="block text-base font-black tracking-normal text-paper max-md:text-xs">{{
          visiblePageLabel
        }}</strong>
        {{ visiblePageTypeLabel }}
      </div>
    </header>
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <AlbumBook
          class="h-full min-h-0 w-full"
          :pages="pages"
          :current-page="currentPage"
          :is-open="isBookOpen"
          :display-mode="displayMode"
          :open-start-page="albumDefinition.layout.openStartPage"
          :show-contents-shortcut="isTeamPageVisible"
          @open="openBook"
          @close="closeBook"
          @previous="previousPage"
          @next="nextPage"
          @contents="openContents"
        >
          <template #default="{ pageIndex }">
            <AlbumEditorialPage
              v-if="editorialPages[pages[pageIndex].geometry.id]"
              :definition="editorialPages[pages[pageIndex].geometry.id]"
              :page-number="pages[pageIndex].geometry.number"
              :release-series="latestReleaseSeries"
              :releases="recentReleaseNotes"
              @navigate="openEditorialPage"
            />
            <AlbumContentsPage
              v-else-if="
                albumContentsTeams.length > 0 &&
                pages[pageIndex].geometry.number >= contentsFirstPage &&
                pages[pageIndex].geometry.number <= contentsLastPage
              "
              :page-number="pages[pageIndex].geometry.number"
              :teams="getContentsTeams(pages[pageIndex].geometry.number)"
              @select="openTeam"
            />
            <template v-else>
              <StickerSlot
                v-for="slot in pages[pageIndex].geometry.slots"
                :key="slot.id"
                :slot="slot"
                :page="pages[pageIndex].geometry"
                :target-card="getCard(slot.playerId)"
                :card="getPlacedCard(slot.id)?.card"
                :instance="getPlacedCard(slot.id)?.instance"
                :placement="getPlacedCard(slot.id)?.placement"
                :preparation="getPlacedCard(slot.id)?.preparation"
                :variant-count="getPlacedCards(slot.id).length"
                :highlighted="activeTargetId === slot.playerId"
                @preview="openPreview"
                @change-variant="showNextPlacedCard(slot.id)"
              />
              <span
                class="absolute bottom-[3%] z-20 min-w-8 rounded-full border border-ink/15 bg-paper/90 px-2 py-1 text-center text-[clamp(7px,1vw,15px)] font-black leading-none text-coral shadow-sm backdrop-blur-sm"
                :class="pages[pageIndex].geometry.number % 2 === 0 ? 'left-[5%]' : 'right-[5%]'"
                aria-hidden="true"
              >
                {{ String(pages[pageIndex].geometry.number).padStart(2, '0') }}
              </span>
            </template>
          </template>
        </AlbumBook>
      </div>

      <StickerTray
        v-if="cards.length > 0"
        :cards="trayCards"
        :highlighted-instance-id="focusedTrayInstanceId"
        :auto-prepare-instance-id="autoPrepareInstanceId"
        :page-filter-active="isTrayPageFiltered"
        :page-filter-available="visibleSlotTotal > 0"
        @toggle-page-filter="isTrayPageFiltered = !isTrayPageFiltered"
        @auto-prepare-started="clearAutoPrepareAction"
        @focus="focusCardTarget"
        @clear-focus="clearCardTarget"
        @drag-start="prepareDropPage"
        @ready="savePreparation"
        @drop="handleDrop"
        @remove="removeCard"
      />
    </div>

    <AlbumDropConfirm
      v-model:visible="isConfirmOpen"
      :kind="confirmationKind"
      @confirm="confirmDrop"
      @cancel="cancelDrop"
    />
    <StickerPreviewDialog
      v-model:visible="isPreviewOpen"
      :card="previewItem?.card"
      :instance="previewItem?.instance"
      @remove="removeCard($event.id)"
    />
  </section>
</template>
