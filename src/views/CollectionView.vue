<script setup lang="ts">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getLibraryAlbums, requireAlbum } from '@/data/albumRegistry'
import {
  BLISTER_CONFIGS,
  DELETED_CARD_CONFIG,
  MILLISECONDS_PER_DAY,
} from '@/config/gameBalance'
import { useCollectionStore } from '@/stores/collection'
import { useDeletedCardsStore } from '@/stores/deletedCards'
import { useGameGuideStore } from '@/stores/gameGuide'
import { formatCardDisplayName } from '@/utils/cardDisplayName'
import type {
  AlbumContentsItem,
  AlbumDefinition,
  CardDefinition,
  CollectionItem,
  StickerInstance,
  StickerTrayItem,
} from '@/types'

import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Button from 'primevue/button'
import Select from 'primevue/select'

import CollectionControls from '@/components/Collection/CollectionControls.vue'
import DuplicateExchangePanel from '@/components/Collection/DuplicateRecyclePanel.vue'
import StickerPreviewDialog from '@/components/Sticker/StickerPreviewDialog.vue'
import LoadableImage from '@/components/ui/LoadableImage.vue'

type CollectionFilter = 'all' | 'ready' | 'album'
type CollectionSort = 'status' | 'album' | 'name'

interface CollectionFilterOption {
  value: CollectionFilter
  label: string
  count: number
}

interface CollectionSortOption {
  value: CollectionSort
  label: string
}

interface CollectionTeamOption {
  value: string
  label: string
}

interface DeletedCollectionItem extends CollectionItem {
  deletedAt: number
}


const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const collection = useCollectionStore()
const deletedCards = useDeletedCardsStore()
const gameGuide = useGameGuideStore()
const requestedAlbumId: string =
  typeof route.query.albumId === 'string'
    ? route.query.albumId
    : BLISTER_CONFIGS.standard.albumId
const visibleAlbums: readonly AlbumDefinition[] = getLibraryAlbums().filter(
  ({ cards }): boolean => cards.length > 0,
)
const requestedAlbum: AlbumDefinition | undefined = visibleAlbums.find(
  ({ id }): boolean => id === requestedAlbumId,
)
const fallbackAlbum: AlbumDefinition | undefined =
  visibleAlbums.find(({ id }): boolean => id === BLISTER_CONFIGS.standard.albumId) ??
  visibleAlbums[0]
if (!fallbackAlbum) throw new Error('No visible albums available for collection')
const activeAlbumId: Ref<string> = ref(requestedAlbum?.id ?? fallbackAlbum.id)
const activeAlbum: ComputedRef<AlbumDefinition> = computed(() =>
  requireAlbum(activeAlbumId.value),
)
const albumOptions = visibleAlbums.map((album) => ({
  value: album.id,
  label: t(album.shortName),
}))
const cards: ComputedRef<CardDefinition[]> = computed(() => activeAlbum.value.cards)
const albumContentsTeams: ComputedRef<AlbumContentsItem[]> = computed(
  () => activeAlbum.value.contents,
)
const selectedProgress = computed(() => collection.getAlbumProgress(activeAlbumId.value))
const activeTab: Ref<string> = ref(route.query.tab === 'duplicates' ? 'duplicates' : 'collection')
const collectionFilter: Ref<CollectionFilter> = ref(
  route.query.filter === 'ready' ? 'ready' : 'all',
)
const collectionSort: Ref<CollectionSort> = ref('status')
const collectionTeamId: Ref<string> = ref(
  albumContentsTeams.value.some(({ id }): boolean => id === route.query.team)
    ? String(route.query.team)
    : 'all',
)
const collectionFilters: CollectionFilter[] = ['all', 'ready', 'album']
const previewItem: Ref<StickerTrayItem | undefined> = ref(undefined)
const isPreviewOpen: Ref<boolean> = ref(false)
const cardOrder: ComputedRef<Map<string, number>> = computed(
  () =>
    new Map(
      cards.value.map(({ id }, index: number): [string, number] => [id, index]),
    ),
)

const isReadyToPlace = (item: CollectionItem): boolean =>
  ['inventory', 'collection'].includes(item.instance.location)
const needsPreparation = (item: CollectionItem): boolean =>
  isReadyToPlace(item) && !item.instance.preparation
const getCard = (playerId: string): CardDefinition | undefined =>
  cards.value.find(({ id }): boolean => id === playerId)

const openCardPreview = (item: CollectionItem): void => {
  const card: CardDefinition | undefined = getCard(item.instance.playerId)
  if (!card) return
  previewItem.value = { card, instance: item.instance }
  isPreviewOpen.value = true
}

const prepareCardInAlbum = async (instance: StickerInstance): Promise<void> => {
  await gameGuide.consumeAutoPreparation()
  await router.push({
    name: 'album-detail',
    params: { albumId: instance.albumId },
    query: {
      card: instance.playerId,
      instance: instance.id,
      action: 'prepare',
    },
  })
}

const removeCard = async (instance: StickerInstance): Promise<void> => {
  const item: CollectionItem | undefined = collection.items.find(
    ({ instance: currentInstance }): boolean => currentInstance.id === instance.id,
  )
  if (!item) return
  await deletedCards.removeCard(item.instance)
  await collection.load()
}

const isPreparationGuideActive: ComputedRef<boolean> = computed(
  (): boolean => gameGuide.currentStep?.id === 'prepare-first-sticker',
)

const collectedItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  collection.items.filter(
    (item: CollectionItem): boolean =>
      item.instance.location !== 'deleted' &&
      item.instance.albumId === activeAlbumId.value &&
      cards.value.some(({ id }): boolean => id === item.instance.playerId),
  ),
)

// Ограничивает всю коллекцию выбранной сборной до применения статуса и сортировки.
const teamFilteredItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  collectionTeamId.value === 'all'
    ? collectedItems.value
    : collectedItems.value.filter(
        (item: CollectionItem): boolean =>
          getCard(item.instance.playerId)?.teamId === collectionTeamId.value,
      ),
)

const readyItemsCount: ComputedRef<number> = computed(
  (): number => teamFilteredItems.value.filter(isReadyToPlace).length,
)
const albumItemsCount: ComputedRef<number> = computed(
  (): number =>
    teamFilteredItems.value.filter(({ instance }): boolean => instance.location === 'album').length,
)
const collectionFilterOptions: ComputedRef<CollectionFilterOption[]> = computed(
  (): CollectionFilterOption[] =>
    collectionFilters.map(
      (filter: CollectionFilter): CollectionFilterOption => ({
        value: filter,
        label: t(`album.collectionControls.${filter}`),
        count:
          filter === 'all'
            ? teamFilteredItems.value.length
            : filter === 'ready'
              ? readyItemsCount.value
              : albumItemsCount.value,
      }),
    ),
)
const collectionTeamOptions: ComputedRef<CollectionTeamOption[]> = computed(
  (): CollectionTeamOption[] => [
    {
      value: 'all',
      label: t('album.collectionControls.teamOption', {
        name: t('album.collectionControls.allTeams'),
        count: collectedItems.value.length,
      }),
    },
    ...albumContentsTeams.value.map(
      ({ id, nameKey }): CollectionTeamOption => ({
        value: id,
        label: t('album.collectionControls.teamOption', {
          name: t(nameKey),
          count: collectedItems.value.filter(
            (item: CollectionItem): boolean => getCard(item.instance.playerId)?.teamId === id,
          ).length,
        }),
      }),
    ),
  ],
)
const collectionSortOptions: ComputedRef<CollectionSortOption[]> = computed(
  (): CollectionSortOption[] => [
    { value: 'status', label: t('album.collectionControls.sortStatus') },
    { value: 'album', label: t('album.collectionControls.sortAlbum') },
    { value: 'name', label: t('album.collectionControls.sortName') },
  ],
)
const visibleCollectionItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] => {
  const filtered: CollectionItem[] = teamFilteredItems.value.filter(
    (item: CollectionItem): boolean => {
      if (collectionFilter.value === 'ready') return isReadyToPlace(item)
      if (collectionFilter.value === 'album') return item.instance.location === 'album'
      return true
    },
  )

  return [...filtered].sort((left: CollectionItem, right: CollectionItem): number => {
    const leftCard: CardDefinition | undefined = getCard(left.instance.playerId)
    const rightCard: CardDefinition | undefined = getCard(right.instance.playerId)
    if (collectionSort.value === 'name') {
      return (leftCard?.displayName ?? '').localeCompare(rightCard?.displayName ?? '', 'ru')
    }
    if (collectionSort.value === 'status') {
      const statusDifference: number = Number(isReadyToPlace(right)) - Number(isReadyToPlace(left))
      if (statusDifference !== 0) return statusDifference
    }
    return (
      (cardOrder.value.get(left.instance.playerId) ?? Number.MAX_SAFE_INTEGER) -
      (cardOrder.value.get(right.instance.playerId) ?? Number.MAX_SAFE_INTEGER)
    )
  })
})

const getCardDisplayName = (playerId: string): string => {
  const card: CardDefinition | undefined = getCard(playerId)
  return card ? formatCardDisplayName(card) : playerId
}

// Сохраняет порядок журнала удаления и связывает его с исходными экземплярами карточек.
const deletedItems: ComputedRef<DeletedCollectionItem[]> = computed((): DeletedCollectionItem[] =>
  deletedCards.items
    .map(({ instanceId, deletedAt }): DeletedCollectionItem | undefined => {
      const item: CollectionItem | undefined = collection.items.find(
        ({ instance }): boolean => instance.id === instanceId,
      )
      return item ? { ...item, deletedAt } : undefined
    })
    .filter(
      (item: DeletedCollectionItem | undefined): item is DeletedCollectionItem =>
        Boolean(item) && item?.instance.albumId === activeAlbumId.value,
    ),
)

watch(activeAlbumId, (albumId: string): void => {
  collectionTeamId.value = 'all'
  void router.replace({ query: { ...route.query, albumId } })
})

const remainingRestoreDays = (deletedAt: number): number =>
  Math.max(
    1,
    Math.ceil(
      (deletedAt + DELETED_CARD_CONFIG.retentionMs - Date.now()) / MILLISECONDS_PER_DAY,
    ),
  )

const restoreCard = async (instanceId: string): Promise<void> => {
  await deletedCards.restoreCard(instanceId)
  await collection.load()
}

// Подтверждает просмотр коллекции только после появления полученных карточек.
watch(
  (): boolean => collection.isLoaded && collectedItems.value.length > 0,
  (hasCards: boolean): void => {
    if (hasCards) void gameGuide.markCollectionViewed()
  },
  { immediate: true },
)
</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col">
    <div class="flex shrink-0 items-center justify-between gap-2 pb-2 sm:gap-4">
      <div class="min-w-0">
        <p
          class="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-coral max-sm:hidden"
        >
          {{ t('app.collection') }}
        </p>
        <h1
          class="whitespace-nowrap text-xl font-black leading-tight tracking-tight sm:mt-0.5 sm:text-3xl"
        >
          {{ t('album.collectionTitle') }}
        </h1>
        <p class="mt-0.5 hidden text-xs leading-tight text-ink/55 md:block">
          {{ t('album.collectionText') }}
        </p>
      </div>
      <div
        class="flex shrink-0 gap-2 text-right text-[9px] font-semibold leading-tight text-ink/55 sm:gap-5 sm:text-xs"
      >
        <div>
          <strong class="block text-lg font-black leading-none text-ink sm:text-2xl"
            >{{ selectedProgress.collectedCards }} / {{ selectedProgress.totalCards }}</strong
          >
          {{ t('album.uniqueFound') }}
        </div>
        <div>
          <strong class="block text-lg font-black leading-none text-coral sm:text-2xl">{{
            collection.duplicateTotal
          }}</strong>
          {{ t('album.duplicatesStored') }}
        </div>
      </div>
    </div>

    <nav
      v-if="activeTab !== 'duplicates'"
      class="mb-2 flex shrink-0 items-center gap-2 border-2 border-ink bg-paper p-2 shadow-[3px_3px_0_rgb(var(--color-coral)/0.45)] sm:mb-3 sm:gap-4 sm:p-3"
      :aria-label="t('album.collectionControls.albumLabel')"
    >
      <div class="flex shrink-0 items-center gap-2">
        <span
          class="flex size-9 items-center justify-center bg-coral text-sm text-white sm:size-10"
          aria-hidden="true"
        >
          <i class="pi pi-book" />
        </span>
        <div class="hidden sm:block">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-coral">
            {{ t('album.collectionControls.albumSwitchTitle') }}
          </p>
          <p class="text-xs font-semibold text-ink/55">
            {{ t('album.collectionControls.albumSwitchHint') }}
          </p>
        </div>
      </div>

      <Select
        v-model="activeAlbumId"
        class="ml-auto min-w-0 flex-1 border-2 border-ink text-sm font-black sm:max-w-md"
        :options="albumOptions"
        option-label="label"
        option-value="value"
        filter
        :aria-label="t('album.collectionControls.albumLabel')"
        :pt="{
          label: { class: '!py-2 !font-black sm:!py-2.5' },
          option: { class: '!py-2 text-sm font-bold' },
        }"
      >
        <template #value="{ value }">
          <span class="flex min-w-0 items-center gap-2">
            <i class="pi pi-book shrink-0 text-coral" aria-hidden="true" />
            <span class="truncate">
              {{ albumOptions.find((album) => album.value === value)?.label }}
            </span>
          </span>
        </template>
        <template #option="{ option }">
          <span :data-album-id="option.value" class="flex min-w-0 items-center gap-2">
            <i
              class="shrink-0"
              :class="activeAlbumId === option.value ? 'pi pi-check-circle text-coral' : 'pi pi-book text-ink/35'"
              aria-hidden="true"
            />
            <span class="truncate">{{ option.label }}</span>
          </span>
        </template>
      </Select>
    </nav>

    <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col">
      <TabList class="shrink-0">
        <Tab
          value="collection"
          class="max-sm:flex-1 max-sm:justify-center max-sm:px-2"
          :aria-label="t('album.uniqueTab')"
        >
          <span class="flex items-center gap-2">
            <i class="pi pi-images" />
            <span class="hidden sm:inline">{{ t('album.uniqueTab') }}</span>
            <span class="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{{
              collectedItems.length
            }}</span>
          </span>
        </Tab>
        <Tab
          value="duplicates"
          class="max-sm:flex-1 max-sm:justify-center max-sm:px-2"
          :aria-label="t('album.duplicatesTab')"
        >
          <span class="flex items-center gap-2">
            <i class="pi pi-inbox" />
            <span class="hidden sm:inline">{{ t('album.duplicatesTab') }}</span>
            <span class="rounded-full bg-coral/15 px-2 py-0.5 text-xs text-coral">{{
              collection.duplicateTotal
            }}</span>
          </span>
        </Tab>
        <Tab
          value="deleted"
          class="max-sm:flex-1 max-sm:justify-center max-sm:px-2"
          :aria-label="t('album.deletedTab')"
        >
          <span class="flex items-center gap-2">
            <i class="pi pi-trash" />
            <span class="hidden sm:inline">{{ t('album.deletedTab') }}</span>
            <span class="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{{
              deletedItems.length
            }}</span>
          </span>
        </Tab>
      </TabList>

      <TabPanels class="min-h-0 flex-1 overflow-hidden bg-transparent px-0 pb-0 pt-2 sm:pt-3">
        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="collection">
          <template v-if="collectedItems.length">
            <aside
              v-if="isPreparationGuideActive"
              class="mb-3 flex items-start gap-3 border-l-4 border-coral bg-coral/10 p-3"
              role="status"
              data-preparation-guide
            >
              <i class="pi pi-sparkles mt-0.5 text-lg text-coral" aria-hidden="true" />
              <div>
                <strong class="block text-sm">{{
                  t('album.collectionControls.guideTitle')
                }}</strong>
                <p class="mt-0.5 text-xs leading-relaxed text-ink/65">
                  {{ t('album.collectionControls.guideText') }}
                </p>
              </div>
            </aside>

            <CollectionControls
              v-model:filter="collectionFilter"
              v-model:team="collectionTeamId"
              v-model:sort="collectionSort"
              :filter-options="collectionFilterOptions"
              :team-options="collectionTeamOptions"
              :sort-options="collectionSortOptions"
            />

            <div
              v-if="visibleCollectionItems.length"
              class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
            >
              <button
                v-for="item in visibleCollectionItems"
                :key="item.instance.id"
                class="group relative border-2 bg-paper p-2 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                :class="
                  isReadyToPlace(item)
                    ? 'border-mint shadow-[4px_4px_0_rgb(var(--color-mint)/0.45)]'
                    : 'border-gold/80 shadow-[4px_4px_0_rgb(var(--color-gold)/0.32)]'
                "
                type="button"
                :aria-label="
                  t('album.collectionControls.previewCard', {
                    name: getCardDisplayName(item.instance.playerId),
                  })
                "
                data-collection-card
                @click="openCardPreview(item)"
              >
                <span
                  class="absolute right-3 top-3 z-10 rounded bg-mint px-1.5 py-0.5 text-[10px] font-black shadow-sm"
                >
                  {{ item.instance.quality }}%
                </span>
                <LoadableImage
                  v-if="getCard(item.instance.playerId)"
                  class="aspect-[2/3] w-full bg-white object-cover"
                  :src="getCard(item.instance.playerId)?.image"
                  :alt="getCard(item.instance.playerId)?.displayName"
                  fit="cover"
                  defer
                />
                <div class="mt-2 min-w-0">
                  <p class="break-words text-sm font-black leading-tight">
                    {{ getCardDisplayName(item.instance.playerId) }}
                  </p>
                  <p
                    class="mt-1 flex min-w-0 items-center gap-0.5 whitespace-nowrap text-[9px] font-black leading-none sm:gap-1 sm:text-[11px]"
                    :class="
                      needsPreparation(item)
                        ? 'text-coral'
                        : isReadyToPlace(item)
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                    "
                  >
                    <i
                      class="shrink-0"
                      :class="
                        needsPreparation(item)
                          ? 'pi pi-sparkles'
                          : isReadyToPlace(item)
                            ? 'pi pi-send'
                            : 'pi pi-check-circle'
                      "
                    />
                    <span>
                      {{
                        t(
                          needsPreparation(item)
                            ? 'album.collectionControls.needsPreparationStatus'
                            : isReadyToPlace(item)
                              ? 'album.collectionControls.readyStatus'
                              : 'album.collectionControls.albumStatus',
                        )
                      }}
                    </span>
                  </p>
                </div>
                <span
                  class="mt-2 flex min-w-0 items-center justify-between gap-1 overflow-hidden whitespace-nowrap border-t border-ink/10 pt-1.5 text-[8px] font-black uppercase tracking-normal text-ink/45 transition-colors group-hover:text-coral sm:text-[10px] sm:tracking-wide"
                >
                  <span>{{ t('album.collectionControls.previewAction') }}</span>
                  <i class="pi pi-eye shrink-0" aria-hidden="true" />
                </span>
              </button>
            </div>
            <div
              v-else
              class="border border-dashed border-ink/20 p-5 text-center text-sm text-ink/55"
            >
              {{ t('album.collectionControls.filterEmpty') }}
            </div>
          </template>
          <div
            v-else
            class="border border-dashed border-ink/20 p-5 text-center text-sm text-ink/55"
          >
            {{ t('album.empty') }}
          </div>
        </TabPanel>

        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="duplicates">
          <DuplicateExchangePanel />
        </TabPanel>

        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="deleted">
          <div
            v-if="deletedItems.length"
            class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
          >
            <article
              v-for="item in deletedItems"
              :key="item.instance.id"
              class="border-2 border-ink/40 bg-paper p-2 opacity-75 shadow-[4px_4px_0_rgb(var(--color-ink)/0.12)]"
            >
              <LoadableImage
                v-if="getCard(item.instance.playerId)"
                class="aspect-[2/3] w-full bg-white"
                image-class="grayscale"
                :src="getCard(item.instance.playerId)?.image"
                :alt="getCard(item.instance.playerId)?.displayName"
                fit="cover"
                defer
              />
              <div class="mt-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-black">
                    {{ getCardDisplayName(item.instance.playerId) }}
                  </p>
                  <p class="text-[11px] font-semibold text-ink/50">
                    {{ t('album.location.deleted') }}
                  </p>
                  <p class="mt-0.5 text-[10px] font-semibold text-coral">
                    {{
                      t('album.restoreAvailable', {
                        count: remainingRestoreDays(item.deletedAt),
                      })
                    }}
                  </p>
                </div>
                <span class="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-black"
                  >{{ item.instance.quality }}%</span
                >
              </div>
              <Button
                class="mt-2 w-full"
                :label="t('album.restoreCard')"
                icon="pi pi-refresh"
                size="small"
                type="button"
                @click="restoreCard(item.instance.id)"
              />
            </article>
          </div>
          <div
            v-else
            class="flex min-h-28 flex-col items-center justify-center border border-dashed border-ink/20 p-4 text-center"
          >
            <i class="pi pi-trash text-2xl text-ink/25" />
            <strong class="mt-2 text-sm">{{ t('album.deletedEmptyTitle') }}</strong>
            <p class="mt-0.5 hidden max-w-sm text-xs text-ink/55 sm:block">
              {{ t('album.deletedEmptyText') }}
            </p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <StickerPreviewDialog
      v-model:visible="isPreviewOpen"
      :card="previewItem?.card"
      :instance="previewItem?.instance"
      @prepare="prepareCardInAlbum"
      @remove="removeCard"
    />
  </section>
</template>
