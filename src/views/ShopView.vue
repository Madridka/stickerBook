<script setup lang="ts">
import { onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ShopItem from '@/components/Shop/ShopItem.vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import { usePackHuntStore } from '@/stores/packHunt'
import packData from '@/data/mainConst.json'
import { selectPackMiniGame, type PackMiniGameId } from '@/utils/selectPackMiniGame'

const { t } = useI18n()
const player = usePlayerStore()
const inventory = useInventoryStore()
const packHunt = usePackHuntStore()
const router = useRouter()
const isPurchasing: Ref<boolean> = ref(false)
const hasPurchaseError: Ref<boolean> = ref(false)

// Берёт цену Pack из игровых данных магазина

// Сначала сохраняет Pack и только после успешной записи списывает coins.
const buyPack = async (): Promise<void> => {
  if (isPurchasing.value || player.coins < packData.price) return

  isPurchasing.value = true
  hasPurchaseError.value = false
  try {
    try {
      await inventory.addPack()
    } catch {
      hasPurchaseError.value = true
      return
    }

    if (!player.spendCoins(packData.price)) return
    try {
      await router.push({ name: 'pack-opening' })
    } catch {
      window.location.assign(router.resolve({ name: 'pack-opening' }).href)
    }
  } finally {
    isPurchasing.value = false
  }
}

const playPackHunt = async (): Promise<void> => {
  if (!packHunt.canPlay) return
  const game: PackMiniGameId = selectPackMiniGame()
  await router.push({ name: 'pack-hunt', query: { game } })
}

const openOwnedPack = async (): Promise<void> => {
  if (!inventory.isLoaded || inventory.packCount <= 0) return
  await router.push({ name: 'pack-opening' })
}

onMounted(async (): Promise<void> => {
  await Promise.all([packHunt.load(), inventory.load()])
})
</script>

<template>
  <!-- Основной экран магазина -->
  <section class="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col justify-center">
    <!-- Название текущего раздела -->
    <p class="mb-1 hidden text-xs font-bold uppercase tracking-[0.16em] text-coral sm:block">
      {{ t('app.shop') }}
    </p>
    <!-- Заголовок магазина и текущий баланс игрока -->
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-3xl font-black tracking-tight sm:text-4xl">{{ t('shop.title') }}</h1>
      <!-- Видимый остаток coins перед покупкой -->
      <div class="shrink-0 border border-ink/15 px-3 py-1.5 text-right">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">
          {{ t('shop.balance') }}
        </p>
        <p class="text-lg font-black leading-tight tabular-nums sm:text-xl">
          {{ player.formattedCoins }} {{ t('shop.coins') }}
        </p>
      </div>
    </div>

    <!-- Краткое описание ассортимента -->
    <p class="mt-1 hidden text-xs text-ink/55 md:block">{{ t('shop.text') }}</p>

    <!-- Доступные товары магазина -->
    <ShopItem
      class="mt-4"
      :price="packData.price"
      :can-buy="player.coins >= packData.price"
      :purchasing="isPurchasing"
      :daily-remaining="packHunt.remainingToday"
      :daily-limit="packHunt.dailyLimit"
      :mini-game-loaded="packHunt.isLoaded"
      :owned-packs="inventory.packCount"
      :inventory-loaded="inventory.isLoaded"
      @purchase="buyPack"
      @play="playPackHunt"
      @open="openOwnedPack"
    />
    <p v-if="hasPurchaseError" class="mt-4 text-sm font-bold text-coral" role="alert">
      {{ t('shop.purchaseError') }}
    </p>
  </section>
</template>
