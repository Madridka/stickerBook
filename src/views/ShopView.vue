<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ShopItem from '@/components/Shop/ShopItem.vue'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import shopData from '@/data/shop.json'

const { t } = useI18n()
const player = usePlayerStore()
const inventory = useInventoryStore()

// Берёт цену Pack из игровых данных магазина
const packPrice: number = shopData.items[0].price

// Списывает coins и добавляет новый Pack в инвентарь
const buyPack = async (): Promise<void> => {
  if (player.spendCoins(packPrice)) await inventory.addPack()
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
      :price="packPrice"
      :can-buy="player.coins >= packPrice"
      @purchase="buyPack"
    />
  </section>
</template>
