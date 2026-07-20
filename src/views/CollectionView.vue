<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import DuplicateExchangePanel from '@/components/Collection/DuplicateExchangePanel.vue'
import cards from '@/data/wc-26/players'
import { useCollectionStore } from '@/stores/collection'
import { useDeletedCardsStore } from '@/stores/deletedCards'
import type { CollectionItem, PlayerCard } from '@/types'

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
const collection = useCollectionStore()
const deletedCards = useDeletedCardsStore()
const activeTab: Ref<string> = ref('collection')
const collectionFilter: Ref<CollectionFilter> = ref('all')
const collectionSort: Ref<CollectionSort> = ref('status')
const collectionFilters: CollectionFilter[] = ['all', 'ready', 'album']
const cardOrder: Map<string, number> = new Map(
  cards.map(({ id }, index: number): [string, number] => [id, index]),
)

const isReadyToPlace = (item: CollectionItem): boolean =>
  ['inventory', 'collection'].includes(item.instance.location)
const getCard = (playerId: string): PlayerCard | undefined =>
  cards.find(({ id }): boolean => id === playerId)

const collectedItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  collection.items.filter((item: CollectionItem): boolean =>
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
  const filtered: CollectionItem[] = collectedItems.value.filter((item: CollectionItem): boolean => {
    if (collectionFilter.value === 'ready') return isReadyToPlace(item)
    if (collectionFilter.value === 'album') return item.instance.location === 'album'
    return true
  })

  return [...filtered].sort((left: CollectionItem, right: CollectionItem): number => {
    const leftCard: PlayerCard | undefined = getCard(left.instance.playerId)
    const rightCard: PlayerCard | undefined = getCard(right.instance.playerId)
    if (collectionSort.value === 'name') {
      return (leftCard?.fullName ?? '').localeCompare(rightCard?.fullName ?? '', 'ru')
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

</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col">
    <div class="flex shrink-0 flex-wrap items-end justify-between gap-4 pb-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-coral">
          {{ t('app.collection') }}
        </p>
        <h1 class="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          {{ t('album.collectionTitle') }}
        </h1>
        <p class="mt-1 text-sm text-ink/60">{{ t('album.collectionText') }}</p>
      </div>
      <div class="flex gap-6 text-right text-xs font-semibold text-ink/55">
        <div>
          <strong class="block text-2xl font-black text-ink"
            >{{ collectedItems.length }} / {{ collection.total }}</strong
          >
          {{ t('album.uniqueFound') }}
        </div>
        <div>
          <strong class="block text-2xl font-black text-coral">{{
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

      <TabPanels class="min-h-0 flex-1 overflow-hidden bg-transparent px-0 pb-0 pt-4">
        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="collection">
          <template v-if="collectedItems.length">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SelectButton
                v-model="collectionFilter"
                class="collection-filter"
                :options="collectionFilterOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                :aria-label="t('album.collectionControls.filterLabel')"
              >
                <template #option="{ option }">
                  <span class="flex items-center gap-1.5 text-xs font-black">
                    {{ option.label }}
                    <span class="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px]">
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
                  option-label="label"
                  option-value="value"
                  :aria-label="t('album.collectionControls.sortLabel')"
                />
              </label>
            </div>

            <div
              v-if="visibleCollectionItems.length"
              class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              <article
                v-for="item in visibleCollectionItems"
                :key="item.instance.id"
                class="border-2 bg-paper p-2"
                :class="
                  isReadyToPlace(item)
                    ? 'border-mint shadow-[4px_4px_0_rgb(var(--color-mint)/0.45)]'
                    : 'border-gold/80 shadow-[4px_4px_0_rgb(var(--color-gold)/0.32)]'
                "
              >
                <img
                  v-if="getCard(item.instance.playerId)"
                  class="aspect-[2/3] w-full bg-white object-cover"
                  :src="getCard(item.instance.playerId)?.image"
                  :alt="getCard(item.instance.playerId)?.fullName"
                />
                <div class="mt-2 flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black">
                      {{ getCard(item.instance.playerId)?.fullName }}
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
              </article>
            </div>
            <div
              v-else
              class="border border-dashed border-ink/20 p-10 text-center text-ink/55"
            >
              {{ t('album.collectionControls.filterEmpty') }}
            </div>
          </template>
          <div v-else class="border border-dashed border-ink/20 p-10 text-center text-ink/55">
            {{ t('album.empty') }}
          </div>
        </TabPanel>

        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="duplicates">
          <DuplicateExchangePanel />
        </TabPanel>

        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="deleted">
          <div
            v-if="deletedItems.length"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
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
                :alt="getCard(item.instance.playerId)?.fullName"
              />
              <div class="mt-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-black">
                    {{ getCard(item.instance.playerId)?.fullName }}
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
            class="flex h-full min-h-56 flex-col items-center justify-center border border-dashed border-ink/20 p-8 text-center"
          >
            <i class="pi pi-trash text-4xl text-ink/25" />
            <strong class="mt-4 text-lg">{{ t('album.deletedEmptyTitle') }}</strong>
            <p class="mt-1 max-w-sm text-sm text-ink/55">{{ t('album.deletedEmptyText') }}</p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>
