<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import cardsData from '@/data/wc-26/mexico/players.json'
import { useCollectionStore } from '@/stores/collection'
import type { CollectionItem, PlayerCard, StickerInstance } from '@/types'

interface DuplicateGroup {
  playerId: string
  instances: StickerInstance[]
}

const { t } = useI18n()
const collection = useCollectionStore()
const activeTab: Ref<string> = ref('collection')
const cards: PlayerCard[] = cardsData as PlayerCard[]

const collectedItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  collection.items.filter((item: CollectionItem): boolean =>
    cards.some(({ id }): boolean => id === item.instance.playerId),
  ),
)

// Группирует физические экземпляры повторов по карточке для отображения в хранилище.
const duplicateGroups: ComputedRef<DuplicateGroup[]> = computed((): DuplicateGroup[] => {
  const groups: Map<string, StickerInstance[]> = new Map()
  collection.duplicates.forEach((instance: StickerInstance): void => {
    groups.set(instance.playerId, [...(groups.get(instance.playerId) ?? []), instance])
  })
  return Array.from(groups, ([playerId, instances]): DuplicateGroup => ({ playerId, instances }))
})

const getCard = (playerId: string): PlayerCard | undefined =>
  cards.find(({ id }): boolean => id === playerId)
</script>

<template>
  <section class="flex h-full min-h-0 w-full flex-col">
    <div class="flex shrink-0 flex-wrap items-end justify-between gap-4 pb-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-coral">{{ t('app.collection') }}</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{{ t('album.collectionTitle') }}</h1>
        <p class="mt-1 text-sm text-ink/60">{{ t('album.collectionText') }}</p>
      </div>
      <div class="flex gap-6 text-right text-xs font-semibold text-ink/55">
        <div>
          <strong class="block text-2xl font-black text-ink">{{ collection.items.length }} / {{ collection.total }}</strong>
          {{ t('album.uniqueFound') }}
        </div>
        <div>
          <strong class="block text-2xl font-black text-coral">{{ collection.duplicateTotal }}</strong>
          {{ t('album.duplicatesStored') }}
        </div>
      </div>
    </div>

    <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col">
      <TabList class="shrink-0">
        <Tab value="collection">
          <span class="flex items-center gap-2">
            <i class="pi pi-images" />
            {{ t('album.uniqueTab') }}
            <span class="rounded-full bg-ink/10 px-2 py-0.5 text-xs">{{ collectedItems.length }}</span>
          </span>
        </Tab>
        <Tab value="duplicates">
          <span class="flex items-center gap-2">
            <i class="pi pi-inbox" />
            {{ t('album.duplicatesTab') }}
            <span class="rounded-full bg-coral/15 px-2 py-0.5 text-xs text-coral">{{ collection.duplicateTotal }}</span>
          </span>
        </Tab>
      </TabList>

      <TabPanels class="min-h-0 flex-1 overflow-hidden bg-transparent px-0 pb-0 pt-4">
        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="collection">
          <div v-if="collectedItems.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <article
              v-for="item in collectedItems"
              :key="item.instance.id"
              class="border-2 border-ink bg-paper p-2 shadow-[4px_4px_0_rgb(var(--color-ink)/0.12)]"
            >
              <img
                v-if="getCard(item.instance.playerId)"
                class="aspect-[2/3] w-full bg-white object-cover"
                :src="getCard(item.instance.playerId)?.image"
                :alt="getCard(item.instance.playerId)?.fullName"
              />
              <div class="mt-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-black">{{ getCard(item.instance.playerId)?.fullName }}</p>
                  <p class="text-[11px] font-semibold text-ink/50">
                    {{ t(`album.location.${item.instance.location}`) }}
                  </p>
                </div>
                <span class="rounded bg-mint px-1.5 py-0.5 text-[10px] font-black">{{ item.instance.quality }}%</span>
              </div>
            </article>
          </div>
          <div v-else class="border border-dashed border-ink/20 p-10 text-center text-ink/55">
            {{ t('album.empty') }}
          </div>
        </TabPanel>

        <TabPanel class="h-full min-h-0 overflow-y-auto pr-2" value="duplicates">
          <div v-if="duplicateGroups.length" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <article
              v-for="group in duplicateGroups"
              :key="group.playerId"
              class="relative mb-2 mr-2 border-2 border-ink bg-paper p-2 shadow-[8px_8px_0_rgb(var(--color-coral)/0.28)]"
            >
              <span class="absolute right-3 top-3 z-10 rounded-full bg-coral px-2 py-1 text-xs font-black text-white shadow">
                ×{{ group.instances.length }}
              </span>
              <img
                v-if="getCard(group.playerId)"
                class="aspect-[2/3] w-full bg-white object-cover"
                :src="getCard(group.playerId)?.image"
                :alt="getCard(group.playerId)?.fullName"
              />
              <p class="mt-2 truncate text-sm font-black">{{ getCard(group.playerId)?.fullName }}</p>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-coral">{{ t('album.inDuplicateStorage') }}</p>
            </article>
          </div>
          <div v-else class="flex h-full min-h-56 flex-col items-center justify-center border border-dashed border-ink/20 p-8 text-center">
            <i class="pi pi-inbox text-4xl text-ink/25" />
            <strong class="mt-4 text-lg">{{ t('album.duplicatesEmptyTitle') }}</strong>
            <p class="mt-1 max-w-sm text-sm text-ink/55">{{ t('album.duplicatesEmptyText') }}</p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>
