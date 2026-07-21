<script setup lang="ts">
import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import PackAnimation from '@/components/PackAnimation.vue'
import StickerReveal from '@/components/StickerReveal.vue'
import cards from '@/data/wc-26/players'
import packData from '@/data/mainConst.json'
import { useCollectionStore } from '@/stores/collection'
import { useInventoryStore } from '@/stores/inventory'
import { usePackOpeningStore, type AdvancePackOpeningResult } from '@/stores/packOpening'
import type { PlayerCard } from '@/types'

const { t } = useI18n()
const router = useRouter()
const inventory = useInventoryStore()
const collection = useCollectionStore()
const packOpening = usePackOpeningStore()
const cardById: Map<string, PlayerCard> = new Map(
  cards.map((card: PlayerCard): [string, PlayerCard] => [card.id, card]),
)
const isAnimationComplete: Ref<boolean> = ref(false)
const isReady: Ref<boolean> = ref(false)
const currentIndex: ComputedRef<number> = computed(
  (): number => packOpening.session?.currentIndex ?? 0,
)
const rewardTotal: ComputedRef<number> = computed(
  (): number => packOpening.session?.rewards.length ?? packData.cardsPerPack,
)
const isFinished: ComputedRef<boolean> = computed(
  (): boolean => currentIndex.value >= rewardTotal.value,
)
const currentCard: ComputedRef<PlayerCard | undefined> = computed(
  (): PlayerCard | undefined => {
    const playerId: string | undefined =
      packOpening.session?.rewards[currentIndex.value]?.playerId
    return playerId ? cardById.get(playerId) : undefined
  },
)
const isCurrentDuplicate: ComputedRef<boolean> = computed(
  (): boolean => Boolean(packOpening.session?.rewards[currentIndex.value]?.isDuplicate),
)

// Создаёт новую сохраняемую сессию или восстанавливает незавершённый показ.
const initializeOpening = async (): Promise<void> => {
  const session = await packOpening.start()
  if (!session) {
    await router.replace({ name: 'shop' })
    return
  }

  isAnimationComplete.value = session.animationComplete
  isReady.value = true
}

// Сохраняет переход от анимации пака к первой карточке.
const handleAnimationComplete = async (): Promise<void> => {
  await packOpening.markAnimationComplete()
  isAnimationComplete.value = true
}

// Сохраняет прогресс; после последней карточки атомарно выдаёт все награды.
const handleNextCard = async (): Promise<void> => {
  const result: AdvancePackOpeningResult = await packOpening.advance()
  if (result === 'completed') {
    await Promise.all([inventory.load(), collection.load()])
  }
}

// После полного просмотра возвращает игрока к выбранному разделу.
const navigateTo = async (name: 'home' | 'shop' | 'album' | 'collection'): Promise<void> => {
  await router.push({ name })
}

onMounted(initializeOpening)
</script>

<template>
  <section
    class="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col items-center justify-center py-2"
  >
    <div
      v-if="isReady && !isAnimationComplete"
      class="flex w-full flex-1 items-center justify-center"
    >
      <PackAnimation @complete="handleAnimationComplete" />
    </div>

    <template v-else-if="isReady && !isFinished && currentCard">
      <div class="mb-2 text-center">
        <p class="hidden text-xs font-bold uppercase tracking-[0.16em] text-coral sm:block">
          {{ t('packOpening.eyebrow') }}
        </p>
        <h1 class="text-2xl font-black tracking-tight sm:mt-1 sm:text-4xl">
          {{ t('packOpening.title') }}
        </h1>
      </div>
      <StickerReveal
        :key="currentCard.id + currentIndex"
        :card="currentCard"
        :duplicate="isCurrentDuplicate"
        :index="currentIndex"
        :total="rewardTotal"
        :advancing="packOpening.isAdvancing"
        @next="handleNextCard"
      />
    </template>

    <div v-else-if="isReady" class="flex w-full flex-col items-center text-center">
      <div
        class="flex h-20 w-20 items-center justify-center rounded-full bg-mint text-4xl text-ink"
      >
        ✓
      </div>
      <p class="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-coral">
        {{ t('packOpening.eyebrow') }}
      </p>
      <h1 class="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
        {{ t('packOpening.complete') }}
      </h1>
      <p class="mt-2 max-w-md text-sm text-ink/60">{{ t('packOpening.completeText') }}</p>
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          :label="t('packOpening.continue')"
          icon="pi pi-arrow-right"
          type="button"
          @click="navigateTo('home')"
        />
        <Button
          :label="t('app.shop')"
          icon="pi pi-shopping-bag"
          outlined
          type="button"
          @click="navigateTo('shop')"
        />
        <Button
          :label="t('app.album')"
          icon="pi pi-book"
          outlined
          type="button"
          @click="navigateTo('album')"
        />
        <Button
          :label="t('app.collection')"
          icon="pi pi-inbox"
          outlined
          type="button"
          @click="navigateTo('collection')"
        />
      </div>
    </div>
  </section>
</template>
