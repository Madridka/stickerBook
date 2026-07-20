<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'

interface Props {
  price: number
  canBuy: boolean
  purchasing?: boolean
  dailyRemaining: number
  dailyLimit: number
  miniGameLoaded: boolean
  ownedPacks: number
  inventoryLoaded: boolean
}

const props: Props = withDefaults(defineProps<Props>(), { purchasing: false })
const emit = defineEmits<{ purchase: []; play: []; open: [] }>()
const { t } = useI18n()

// Форматирует цену товара по локали интерфейса
const formattedPrice: ComputedRef<string> = computed(() => props.price.toLocaleString('ru-RU'))

// Передаёт запрос покупки родительскому экрану магазина
const handlePurchase = (): void => emit('purchase')
const handlePlay = (): void => emit('play')
const handleOpen = (): void => emit('open')
</script>

<template>
  <!-- Карточка набора с двумя независимыми способами получения -->
  <article class="border border-ink/15 bg-paper/70 p-5 shadow-sm sm:p-7">
    <!-- Информация о типе и названии товара -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-coral">
          {{ t('shop.itemType') }}
        </p>
        <h2 class="mt-1 text-3xl font-black tracking-tight">{{ t('shop.pack') }}</h2>
        <p class="mt-1 text-sm text-ink/60">{{ t('shop.packDescription') }}</p>
      </div>

      <!-- Сохранённые блистеры остаются доступны независимо от способа получения. -->
      <aside class="shrink-0 border border-gold/50 bg-gold/15 p-3 text-right">
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-ink/45">
          {{ t('shop.inventory') }}
        </p>
        <p class="mt-1 text-sm font-black tabular-nums" aria-live="polite">
          {{ t('shop.inventoryCount', { count: ownedPacks }) }}
        </p>
        <Button
          class="mt-2"
          :label="t('shop.openOwnedPack')"
          icon="pi pi-gift"
          size="small"
          :disabled="!inventoryLoaded || ownedPacks <= 0"
          type="button"
          @click="handleOpen"
        />
      </aside>
    </div>

    <!-- Два способа получения набора сохраняют старую покупку и добавляют мини-игру -->
    <div class="relative mt-5 border-t border-ink/10 pt-5">
      <span
        class="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-paper px-3 text-xs font-black uppercase tracking-[0.18em] text-coral"
      >
        {{ t('shop.or') }}
      </span>
      <div class="grid gap-3 sm:grid-cols-2">
        <section
          class="flex items-center justify-between gap-4 bg-ink/5 p-4 sm:flex-col sm:items-start"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">
              {{ t('shop.buy') }}
            </p>
            <p class="mt-1 text-xl font-black">{{ formattedPrice }} {{ t('shop.coins') }}</p>
          </div>
          <Button
            :label="t('shop.buy')"
            icon="pi pi-shopping-bag"
            :disabled="!canBuy || purchasing"
            :loading="purchasing"
            type="button"
            @click="handlePurchase"
          />
        </section>

        <section class="flex flex-col justify-between gap-3 bg-mint/35 p-4">
          <div>
            <p class="text-sm font-bold">{{ t('shop.miniGameDescription') }}</p>
            <p class="mt-1 text-xs font-semibold text-ink/55">
              {{
                dailyRemaining > 0
                  ? t('shop.dailyGames', { remaining: dailyRemaining, limit: dailyLimit })
                  : t('shop.dailyLimitReached')
              }}
            </p>
          </div>
          <Button
            :label="t('shop.winPack')"
            icon="pi pi-search"
            :disabled="!miniGameLoaded || dailyRemaining <= 0"
            type="button"
            @click="handlePlay"
          />
        </section>
      </div>
    </div>
  </article>
</template>
