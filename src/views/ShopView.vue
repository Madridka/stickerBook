<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ShopItem from '@/components/Shop/ShopItem.vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import packData from '@/data/mainConst.json'

const { t } = useI18n()
const player = usePlayerStore()
const inventory = useInventoryStore()
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
</script>

<template>
  <!-- Основной экран магазина -->
  <section class="mx-auto w-full max-w-3xl">
    <!-- Название текущего раздела -->
    <p class="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-coral">{{ t('app.shop') }}</p>
    <!-- Заголовок магазина и текущий баланс игрока -->
    <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <h1 class="text-5xl font-black tracking-tight sm:text-6xl">{{ t('shop.title') }}</h1>
      <!-- Видимый остаток coins перед покупкой -->
      <div class="border border-ink/15 px-4 py-3 sm:text-right">
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-ink/50">
          {{ t('shop.balance') }}
        </p>
        <p class="mt-1 text-2xl font-black tabular-nums">
          {{ player.formattedCoins }} {{ t('shop.coins') }}
        </p>
      </div>
    </div>

    <!-- Краткое описание ассортимента -->
    <p class="mt-5 text-lg text-ink/65">{{ t('shop.text') }}</p>

    <!-- Доступные товары магазина -->
    <ShopItem
      class="mt-10"
      :price="packData.price"
      :can-buy="player.coins >= packData.price"
      :purchasing="isPurchasing"
      @purchase="buyPack"
    />
    <p v-if="hasPurchaseError" class="mt-4 text-sm font-bold text-coral" role="alert">
      {{ t('shop.purchaseError') }}
    </p>
  </section>
</template>
