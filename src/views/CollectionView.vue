<script setup lang="ts">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import cards from '@/data/wc-26/catalog'
import { useCollectionStore } from '@/stores/collection'
import { useDeletedCardsStore } from '@/stores/deletedCards'
import { useGameGuideStore } from '@/stores/gameGuide'
import type { CardDefinition, CollectionItem } from '@/types'

import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import DuplicateExchangePanel from '@/components/Collection/DuplicateExchangePanel.vue'

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

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const collection = useCollectionStore()
const deletedCards = useDeletedCardsStore()
const gameGuide = useGameGuideStore()
const activeTab: Ref<string> = ref(route.query.tab === 'duplicates' ? 'duplicates' : 'collection')
const collectionFilter: Ref<CollectionFilter> = ref(
  route.query.filter === 'ready' ? 'ready' : 'all',
)
const collectionSort: Ref<CollectionSort> = ref('status')
const collectionFilters: CollectionFilter[] = ['all', 'ready', 'album']
const cardOrder: Map<string, number> = new Map(
  cards.map(({ id }, index: number): [string, number] => [id, index]),
)

const isReadyToPlace = (item: CollectionItem): boolean =>
  ['inventory', 'collection'].includes(item.instance.location)
const getCard = (playerId: string): CardDefinition | undefined =>
  cards.find(({ id }): boolean => id === playerId)

// Открывает разворот нужной карточки, не запуская подготовку наклейки.
const openCardInAlbum = async (item: CollectionItem): Promise<void> => {
  await router.push({
    name: 'album-wc-26',
    query: {
      card: item.instance.playerId,
      instance: item.instance.id,
    },
  })
}

const collectedItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  collection.items.filter(
    (item: CollectionItem): boolean =>
      item.instance.location !== 'deleted' &&
      cards.some(({ id }): boolean => id === item.instance.playerId),
  ),
)

const readyItemsCount: ComputedRef<number> = computed(
  (): number => collectedItems.value.filter(isReadyToPlace).length,
)
const albumItemsCount: ComputedRef<number> = computed(
  (): number =>
    collectedItems.value.filter(({ instance }): boolean => instance.location === 'album').length,
)
const collectionFilterOptions: ComputedRef<CollectionFilterOption[]> = computed(
  (): CollectionFilterOption[] =>
    collectionFilters.map(
      (filter: CollectionFilter): CollectionFilterOption => ({
        value: filter,
        label: t(`album.collectionControls.${filter}`),
        count:
          filter === 'all'
            ? collectedItems.value.length
            : filter === 'ready'
              ? readyItemsCount.value
              : albumItemsCount.value,
      }),
    ),
)
const collectionSortOptions: ComputedRef<CollectionSortOption[]> = computed(
  (): CollectionSortOption[] => [
    { value: 'status', label: t('album.collectionControls.sortStatus') },
    { value: 'album', label: t('album.collectionControls.sortAlbum') },
    { value: 'name', label: t('album.collectionControls.sortName') },
  ],
)
const visibleCollectionItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] => {
  const filtered: CollectionItem[] = collectedItems.value.filter(
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
      (cardOrder.get(left.instance.playerId) ?? Number.MAX_SAFE_INTEGER) -
      (cardOrder.get(right.instance.playerId) ?? Number.MAX_SAFE_INTEGER)
    )
  })
})

// Сохраняет порядок журнала удаления и связывает его с исходными экземплярами карточек.
const deletedItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  deletedCards.items
    .map(({ instanceId }): CollectionItem | undefined =>
      collection.items.find(({ instance }): boolean => instance.id === instanceId),
    )
    .filter((item: CollectionItem | undefined): item is CollectionItem => Boolean(item)),
)

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
    <div class="flex shrink-0 items-center justify-between gap-3 pb-2">
      <div class="min-w-0">
        <p
          class="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-coral max-sm:hidden"
        >
          {{ t('app.collection') }}
        </p>
        <h1 class="truncate text-2xl font-black leading-tight tracking-tight sm:mt-0.5 sm:text-3xl">
          {{ t('album.collectionTitle') }}
        </h1>
        <p class="mt-0.5 hidden text-xs leading-tight text-ink/55 md:block">
          {{ t('album.collectionText') }}
        </p>
      </div>
      <div
        class="flex shrink-0 gap-3 text-right text-[10px] font-semibold leading-tight text-ink/55 sm:gap-5 sm:text-xs"
      >
        <div>
          <strong class="block text-xl font-black leading-none text-ink sm:text-2xl"
            >{{ collection.collectedTotal }} / {{ collection.total }}</strong
          >
          {{ t('album.uniqueFound') }}
        </div>
        <div>
          <strong class="block text-xl font-black leading-none text-coral sm:text-2xl">{{
            collection.duplicateTotal
          }}</strong>
          {{ t('album.duplicatesStored') }}
        </div>
      </div>
    </div>

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
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SelectButton
                v-model="collectionFilter"
                :options="collectionFilterOptions"
                option-label="label"
                option-value="value"
                size="small"
                :allow-empty="false"
                :aria-label="t('album.collectionControls.filterLabel')"
              >
                <template #option="{ option }">
                  <span class="flex items-center gap-1 text-xs font-black">
                    {{ option.label }}
                    <span class="rounded-full bg-current/10 px-1 py-0.5 text-[10px]">
                      {{ option.count }}
                    </span>
                  </span>
                </template>
              </SelectButton>

              <label class="flex items-center gap-2 text-xs font-bold text-ink/55">
                <span class="max-sm:sr-only">{{ t('album.collectionControls.sortLabel') }}</span>
                <Select
                  v-model="collectionSort"
                  class="w-40 text-xs font-bold"
                  :options="collectionSortOptions"
                  size="small"
                  option-label="label"
                  option-value="value"
                  :aria-label="t('album.collectionControls.sortLabel')"
                  :pt="{
                    option: {
                      class: 'text-xs',
                    },
                  }"
                />
              </label>
            </div>

            <div
              v-if="visibleCollectionItems.length"
              class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6"
            >
              <button
                v-for="item in visibleCollectionItems"
                :key="item.instance.id"
                class="group border-2 bg-paper p-2 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                :class="
                  isReadyToPlace(item)
                    ? 'border-mint shadow-[4px_4px_0_rgb(var(--color-mint)/0.45)]'
                    : 'border-gold/80 shadow-[4px_4px_0_rgb(var(--color-gold)/0.32)]'
                "
                type="button"
                :aria-label="
                  t('album.collectionControls.openInAlbum', {
                    name: getCard(item.instance.playerId)?.displayName ?? item.instance.playerId,
                  })
                "
                @click="openCardInAlbum(item)"
              >
                <img
                  v-if="getCard(item.instance.playerId)"
                  class="aspect-[2/3] w-full bg-white object-cover"
                  :src="getCard(item.instance.playerId)?.image"
                  :alt="getCard(item.instance.playerId)?.displayName"
                />
                <div class="mt-2 flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black">
                      {{ getCard(item.instance.playerId)?.displayName }}
                    </p>
                    <p
                      class="mt-0.5 flex items-center gap-1 text-[11px] font-black"
                      :class="isReadyToPlace(item) ? 'text-emerald-700' : 'text-amber-700'"
                    >
                      <i :class="isReadyToPlace(item) ? 'pi pi-send' : 'pi pi-check-circle'" />
                      {{
                        t(
                          isReadyToPlace(item)
                            ? 'album.collectionControls.readyStatus'
                            : 'album.collectionControls.albumStatus',
                        )
                      }}
                    </p>
                  </div>
                  <span class="rounded bg-mint px-1.5 py-0.5 text-[10px] font-black"
                    >{{ item.instance.quality }}%</span
                  >
                </div>
                <span
                  class="mt-2 flex items-center justify-between border-t border-ink/10 pt-1.5 text-[10px] font-black uppercase tracking-wide text-ink/45 transition-colors group-hover:text-coral"
                >
                  {{ t('album.collectionControls.openInAlbumShort') }}
                  <i class="pi pi-arrow-right" aria-hidden="true" />
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
              <img
                v-if="getCard(item.instance.playerId)"
                class="aspect-[2/3] w-full bg-white object-cover grayscale"
                :src="getCard(item.instance.playerId)?.image"
                :alt="getCard(item.instance.playerId)?.displayName"
              />
              <div class="mt-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-black">
                    {{ getCard(item.instance.playerId)?.displayName }}
                  </p>
                  <p class="text-[11px] font-semibold text-ink/50">
                    {{ t('album.location.deleted') }}
                  </p>
                </div>
                <span class="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-black"
                  >{{ item.instance.quality }}%</span
                >
              </div>
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
  </section>
</template>
