<script setup lang="ts">
import { computed, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import PackAnimation from '@/components/PackAnimation.vue'
import StickerReveal from '@/components/StickerReveal.vue'
import cardsData from '@/data/wc-26/mexico/players.json'
import packData from '@/data/mainConst.json'
import { useCollectionStore } from '@/stores/collection'
import { useInventoryStore } from '@/stores/inventory'
import type { PlayerCard } from '@/types'
import { weightedRandom } from '@/utils/weightedRandom'

const { t } = useI18n()
const router = useRouter()
const inventory = useInventoryStore()
const collection = useCollectionStore()
const drawnCards: Ref<PlayerCard[]> = ref([])
const currentIndex: Ref<number> = ref(0)
const isAnimationComplete: Ref<boolean> = ref(false)
const isFinished: ComputedRef<boolean> = computed(() => currentIndex.value >= packData.cardsPerPack)
const currentCard: ComputedRef<PlayerCard | undefined> = computed(
  () => drawnCards.value[currentIndex.value],
)
const isOpening: Ref<boolean> = ref(false)
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

// Формирует пять карточек по весам из JSON перед началом показа
const drawCards = (): void => {
  drawnCards.value = Array.from(
    { length: packData.cardsPerPack },
    (): PlayerCard => weightedRandom(cards),
  )
}

// Списывает один Pack только после того, как данные инвентаря готовы
const consumePack = async (): Promise<void> => {
  if (isOpening.value) return
  isOpening.value = true
  if (!inventory.isLoaded) {
    await new Promise<void>((resolve): void => {
      const stop = watch(
        () => inventory.isLoaded,
        (loaded: boolean): void => {
          if (loaded) {
            stop()
            resolve()
          }
        },
      )
    })
  }
  if (!(await inventory.removePack())) {
    await router.replace({ name: 'shop' })
    return
  }
  drawCards()
}

// Переводит сценарий из анимации Pack к первой карточке
const handleAnimationComplete = (): void => {
  isAnimationComplete.value = true
}

// Сохраняет просмотренную карточку и открывает следующую
const handleNextCard = async (): Promise<void> => {
  const card: PlayerCard | undefined = drawnCards.value[currentIndex.value]
  if (!card) return
  await collection.addSticker(card.id)
  currentIndex.value += 1
}

// После полного просмотра возвращает игрока к выбранному разделу
const navigateTo = async (name: 'home' | 'shop' | 'album'): Promise<void> => {
  await router.push({ name })
}

onMounted(consumePack)
</script>

<template>
  <section
    class="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col items-center justify-center py-2"
  >
    <div v-if="!isAnimationComplete" class="flex w-full flex-1 items-center justify-center">
      <PackAnimation @complete="handleAnimationComplete" />
    </div>

    <template v-else-if="!isFinished && currentCard">
      <div class="mb-4 text-center">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-coral">
          {{ t('packOpening.eyebrow') }}
        </p>
        <h1 class="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
          {{ t('packOpening.title') }}
        </h1>
      </div>
      <StickerReveal
        :key="currentCard.id + currentIndex"
        :card="currentCard"
        :index="currentIndex"
        :total="packData.cardsPerPack"
        @next="handleNextCard"
      />
    </template>

    <div v-else class="flex w-full flex-col items-center text-center">
      <div
        class="flex h-20 w-20 items-center justify-center rounded-full bg-mint text-4xl text-ink"
      >
        ✓
      </div>
      <p class="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-coral">
        {{ t('packOpening.eyebrow') }}
      </p>
      <h1 class="mt-2 text-4xl font-black tracking-tight sm:text-6xl">
        {{ t('packOpening.complete') }}
      </h1>
      <p class="mt-4 max-w-md text-ink/65">{{ t('packOpening.completeText') }}</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
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
      </div>
    </div>
  </section>
</template>
