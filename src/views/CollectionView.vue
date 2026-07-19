<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import cards from '@/data/wc-26/players'
import { useCollectionStore } from '@/stores/collection'
import { useDeletedCardsStore } from '@/stores/deletedCards'
import type { CollectionItem, PlayerCard, StickerInstance } from '@/types'

interface DuplicateGroup {
  playerId: string
  instances: StickerInstance[]
}

type CollectionFilter = 'all' | 'ready' | 'album'
type CollectionSort = 'status' | 'album' | 'name'

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

// Группирует физические экземпляры повторов по карточке для отображения в хранилище.
const duplicateGroups: ComputedRef<DuplicateGroup[]> = computed((): DuplicateGroup[] => {
  const groups: Map<string, StickerInstance[]> = new Map()
  collection.duplicates.forEach((instance: StickerInstance): void => {
    groups.set(instance.playerId, [...(groups.get(instance.playerId) ?? []), instance])
  })
  return Array.from(groups, ([playerId, instances]): DuplicateGroup => ({ playerId, instances }))
})
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
              <div
                class="flex flex-wrap gap-1 rounded-lg bg-ink/5 p-1"
                role="group"
                :aria-label="t('album.collectionControls.filterLabel')"
              >
                <button
                  v-for="filter in collectionFilters"
                  :key="filter"
                  type="button"
                  class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-black transition-colors"
                  :class="
                    collectionFilter === filter
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-ink/60 hover:bg-paper hover:text-ink'
                  "
                  :aria-pressed="collectionFilter === filter"
                  @click="collectionFilter = filter"
                >
                  {{ t(`album.collectionControls.${filter}`) }}
                  <span
                    class="rounded-full px-1.5 py-0.5 text-[10px]"
                    :class="collectionFilter === filter ? 'bg-paper/15' : 'bg-ink/10'"
                  >
                    {{
                      filter === 'all'
                        ? collectedItems.length
                        : filter === 'ready'
                          ? readyItemsCount
                          : albumItemsCount
                    }}
                  </span>
                </button>
              </div>

              <label class="flex items-center gap-2 text-xs font-bold text-ink/55">
                <span class="max-sm:sr-only">{{ t('album.collectionControls.sortLabel') }}</span>
                <select
                  v-model="collectionSort"
                  class="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-xs font-bold text-ink outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
                  :aria-label="t('album.collectionControls.sortLabel')"
                >
                  <option value="status">{{ t('album.collectionControls.sortStatus') }}</option>
                  <option value="album">{{ t('album.collectionControls.sortAlbum') }}</option>
                  <option value="name">{{ t('album.collectionControls.sortName') }}</option>
                </select>
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
          <div
            v-if="duplicateGroups.length"
            class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          >
            <article
              v-for="group in duplicateGroups"
              :key="group.playerId"
              class="relative mb-2 mr-2 border-2 border-ink bg-paper p-2 shadow-[8px_8px_0_rgb(var(--color-coral)/0.28)]"
            >
              <span
                class="absolute right-3 top-3 z-10 rounded-full bg-coral px-2 py-1 text-xs font-black text-white shadow"
              >
                ×{{ group.instances.length }}
              </span>
              <img
                v-if="getCard(group.playerId)"
                class="aspect-[2/3] w-full bg-white object-cover"
                :src="getCard(group.playerId)?.image"
                :alt="getCard(group.playerId)?.fullName"
              />
              <p class="mt-2 truncate text-sm font-black">
                {{ getCard(group.playerId)?.fullName }}
              </p>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-coral">
                {{ t('album.inDuplicateStorage') }}
              </p>
            </article>
          </div>
          <div
            v-else
            class="flex h-full min-h-56 flex-col items-center justify-center border border-dashed border-ink/20 p-8 text-center"
          >
            <i class="pi pi-inbox text-4xl text-ink/25" />
            <strong class="mt-4 text-lg">{{ t('album.duplicatesEmptyTitle') }}</strong>
            <p class="mt-1 max-w-sm text-sm text-ink/55">{{ t('album.duplicatesEmptyText') }}</p>
          </div>
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
