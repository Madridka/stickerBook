<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import cardsData from '@/data/wc-26/mexico/players.json'
import { useCollectionStore } from '@/stores/collection'
import type { CollectionItem, PlayerCard } from '@/types'

const { t } = useI18n()
const collection = useCollectionStore()
const stickerImages: Record<string, string> = import.meta.glob('../assets/game/wc-26/mexico/stickers/*.png', {
  eager: true, import: 'default', query: '?url',
}) as Record<string, string>
const cards: PlayerCard[] = (cardsData as PlayerCard[]).map((card: PlayerCard): PlayerCard => ({
  ...card, image: stickerImages[`../assets/game/wc-26/mexico/stickers/${card.id}.png`] ?? card.image,
}))
const collectedItems: ComputedRef<CollectionItem[]> = computed((): CollectionItem[] =>
  collection.items.filter((item: CollectionItem): boolean => cards.some(({ id }): boolean => id === item.instance.playerId)),
)
const getCard = (playerId: string): PlayerCard | undefined => cards.find(({ id }): boolean => id === playerId)
</script>

<template>
  <section class="mx-auto w-full">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-coral">{{ t('app.collection') }}</p>
        <h1 class="text-5xl font-black tracking-tight sm:text-6xl">{{ t('album.title') }}</h1>
        <p class="mt-5 text-lg text-ink/65">{{ t('album.text') }}</p>
      </div>
      <div class="text-right text-sm font-semibold text-ink/55">
        <strong class="block text-3xl font-black text-ink">{{ collection.items.length }} / {{ collection.total }}</strong>
        {{ t('album.found') }}
      </div>
    </div>
    <div v-if="collectedItems.length" class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <article v-for="item in collectedItems" :key="item.instance.id" class="border-2 border-ink bg-paper p-2 shadow-[5px_5px_0_rgb(var(--color-ink)/0.12)]">
        <img v-if="getCard(item.instance.playerId)" class="aspect-[3/4] w-full bg-white object-contain" :src="getCard(item.instance.playerId)?.image" :alt="getCard(item.instance.playerId)?.fullName" />
        <p class="mt-2 truncate text-sm font-black">{{ getCard(item.instance.playerId)?.fullName }}</p>
        <p v-if="item.duplicateCount" class="text-xs font-semibold text-coral">{{ t('album.duplicates', { count: item.duplicateCount }) }}</p>
      </article>
    </div>
    <div v-else class="mt-12 border border-dashed border-ink/20 p-10 text-center text-ink/55">{{ t('album.empty') }}</div>
  </section>
</template>
