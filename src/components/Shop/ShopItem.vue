<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

interface Props {
  price: number
  canBuy: boolean
}

const props: Props = defineProps<Props>()
const emit = defineEmits<{ purchase: [] }>()
const { t } = useI18n()

// Форматирует цену товара по локали интерфейса
const formattedPrice: ComputedRef<string> = computed(() => props.price.toLocaleString('ru-RU'))

// Передаёт запрос покупки родительскому экрану магазина
const handlePurchase = (): void => emit('purchase')
</script>

<template>
  <!-- Карточка товара с описанием, ценой и действием покупки -->
  <article
    class="flex flex-col gap-6 border border-ink/15 bg-paper/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7"
  >
    <!-- Информация о типе и названии товара -->
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-coral">
        {{ t('shop.itemType') }}
      </p>
      <h2 class="mt-2 text-3xl font-black tracking-tight">{{ t('shop.pack') }}</h2>
      <p class="mt-2 text-sm text-ink/60">{{ t('shop.packDescription') }}</p>
    </div>

    <!-- Цена товара и кнопка покупки -->
    <div class="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
      <span class="text-xl font-black">{{ formattedPrice }} {{ t('shop.coins') }}</span>
      <Button
        :label="t('shop.buy')"
        icon="pi pi-shopping-bag"
        :disabled="!canBuy"
        type="button"
        @click="handlePurchase"
      />
    </div>
  </article>
</template>
