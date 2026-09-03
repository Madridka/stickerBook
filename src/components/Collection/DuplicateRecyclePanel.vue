<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { getAlbumCard, getPlayerAlbumById } from '@/data/albumRegistry'
import { PICK_SHOP_CONFIG } from '@/config/gameBalance'
import { useCollectionStore } from '@/stores/collection'
import { usePickShopStore } from '@/stores/pickShop'
import type { CardDefinition, StickerInstance } from '@/types'

import Button from 'primevue/button'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import LoadableImage from '@/components/ui/LoadableImage.vue'

interface DuplicateGroup {
  key: string
  albumName: string
  card?: CardDefinition
  instances: StickerInstance[]
}

const { t } = useI18n()
const router = useRouter()
const collection = useCollectionStore()
const pickShop = usePickShopStore()
const selectedAmount: Ref<number> = ref(PICK_SHOP_CONFIG.duplicatesPerToken)
const message: Ref<string> = ref('')
const error: Ref<boolean> = ref(false)
const exchangeUnit: number = PICK_SHOP_CONFIG.duplicatesPerToken
const candidateCount: number = PICK_SHOP_CONFIG.candidateCount

// Оставляет минимальный вариант видимым, даже когда повторок пока недостаточно для обмена.
const maxConvertible: ComputedRef<number> = computed(() =>
  Math.floor(collection.duplicateTotal / PICK_SHOP_CONFIG.duplicatesPerToken) *
  PICK_SHOP_CONFIG.duplicatesPerToken,
)
const remainingToExchange: ComputedRef<number> = computed(() =>
  Math.max(0, exchangeUnit - collection.duplicateTotal),
)
const amountOptions: ComputedRef<Array<{ label: string; value: number }>> = computed(() => {
  const configuredValues: number[] = PICK_SHOP_CONFIG.tokenExchangePresetMultipliers.map(
    (multiplier): number => multiplier * exchangeUnit,
  )
  const largestPreset: number = configuredValues[configuredValues.length - 1] ?? exchangeUnit
  const availableValues: number[] = [...configuredValues, maxConvertible.value]
    .filter((value): boolean => value > 0 && value <= maxConvertible.value)
  const values: number[] = availableValues.length ? availableValues : [exchangeUnit]
  return Array.from(new Set(values)).map((value) => ({
    value,
    label: value === maxConvertible.value && value > largestPreset
      ? t('duplicateExchange.recycle.all', {
          count: value,
          tokens: Math.floor(value / exchangeUnit),
        })
      : t('duplicateExchange.recycle.option', {
          duplicates: value,
          tokens: Math.floor(value / exchangeUnit),
        }),
  }))
})
const groups: ComputedRef<DuplicateGroup[]> = computed(() => {
  const grouped: Map<string, StickerInstance[]> = new Map()
  for (const instance of collection.duplicates) {
    const key: string = `${instance.albumId}:${instance.playerId}`
    grouped.set(key, [...(grouped.get(key) ?? []), instance])
  }
  return [...grouped.entries()]
    .map(([key, instances]): DuplicateGroup => {
      const first: StickerInstance = instances[0]
      const album = getPlayerAlbumById(first.albumId)
      return {
        key,
        instances,
        card: getAlbumCard(first.albumId, first.playerId),
        albumName: album ? t(album.shortName) : first.albumId,
      }
    })
    .sort((left, right): number => right.instances.length - left.instances.length)
})

const refresh = async (): Promise<void> => {
  await Promise.all([collection.load(), pickShop.load()])
  selectedAmount.value = Math.min(
    selectedAmount.value,
    maxConvertible.value || PICK_SHOP_CONFIG.duplicatesPerToken,
  )
}

const openMixedPick = async (): Promise<void> => {
  error.value = false
  message.value = ''
  const result = await pickShop.openMixedPickWithDuplicates()
  error.value = result !== 'started'
  await refresh()
}

const convert = async (): Promise<void> => {
  error.value = false
  message.value = ''
  const earned: number = await pickShop.convertDuplicates(selectedAmount.value)
  if (earned === 0) {
    error.value = true
  } else {
    message.value = t('duplicateExchange.recycle.converted', { count: earned })
  }
  await refresh()
}
</script>

<template>
  <section class="flex min-h-full flex-col" aria-labelledby="duplicate-recycle-title">
    <div class="border-2 border-ink bg-paper p-3 shadow-[4px_4px_0_rgb(var(--color-gold)/0.45)] sm:p-4 sm:shadow-[5px_5px_0_rgb(var(--color-gold)/0.45)]">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[9px] font-black uppercase tracking-[.15em] text-coral sm:text-[10px] sm:tracking-[.18em]">
            {{ t('duplicateExchange.recycle.eyebrow') }}
          </p>
          <h2 id="duplicate-recycle-title" class="mt-0.5 text-lg font-black sm:text-xl">
            {{ t('duplicateExchange.recycle.title') }}
          </h2>
          <p class="mt-1 line-clamp-2 max-w-2xl text-[11px] leading-relaxed text-ink/60 sm:text-xs">
            {{ t('duplicateExchange.recycle.description') }}
          </p>
        </div>
        <div class="flex shrink-0 gap-1.5 text-center sm:gap-2">
          <div class="border border-ink/15 px-2 py-1.5 text-center sm:px-3 sm:py-2">
            <p class="text-[8px] font-black uppercase text-ink/45 sm:text-[9px]">{{ t('duplicateExchange.recycle.duplicates') }}</p>
            <strong class="text-lg leading-none tabular-nums sm:text-xl">{{ collection.duplicateTotal }}</strong>
          </div>
          <div class="border border-mint bg-mint/20 px-2 py-1.5 text-center sm:px-3 sm:py-2">
            <p class="text-[8px] font-black uppercase text-ink/45 sm:text-[9px]">{{ t('duplicateExchange.recycle.tokens') }}</p>
            <strong class="text-lg leading-none tabular-nums sm:text-xl">{{ pickShop.tokens }}</strong>
          </div>
        </div>
      </div>

      <!-- Два сценария расхода повторок используют общий курс из gameBalance. -->
      <div class="mt-3 grid gap-3 sm:mt-4 md:grid-cols-2">
        <article class="border border-coral/30 bg-coral/5 p-3">
          <strong class="text-sm">
            {{ t('duplicateExchange.recycle.mixedTitle', { count: candidateCount }) }}
          </strong>
          <p class="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink/55 sm:text-xs">
            {{
              t('duplicateExchange.recycle.mixedText', {
                tradeIn: exchangeUnit,
                candidates: candidateCount,
              })
            }}
          </p>
          <Button
            class="mt-2.5 w-full !py-2 text-xs sm:mt-3"
            :label="t('duplicateExchange.recycle.openMixed', { count: exchangeUnit })"
            icon="pi pi-sparkles"
            size="small"
            :disabled="collection.duplicateTotal < exchangeUnit"
            :loading="pickShop.isProcessing"
            @click="openMixedPick"
          />
        </article>
        <article class="border border-mint/70 bg-mint/10 p-3">
          <div class="flex items-center justify-between gap-2">
            <strong class="text-sm">{{ t('duplicateExchange.recycle.tokensTitle') }}</strong>
            <Button
              class="!p-1 text-xs sm:!hidden"
              :aria-label="t('duplicateExchange.recycle.openStore')"
              :title="t('duplicateExchange.recycle.openStore')"
              icon="pi pi-shopping-bag"
              severity="secondary"
              text
              size="small"
              @click="router.push({ name: 'shop', query: { section: 'picks' } })"
            />
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-ink/55 sm:text-xs">
            {{ t('duplicateExchange.recycle.rate', { duplicates: exchangeUnit }) }}
          </p>
          <p v-if="remainingToExchange" class="mt-1 text-[11px] font-bold text-coral">
            {{ t('duplicateExchange.recycle.remaining', { count: remainingToExchange }) }}
          </p>
          <div class="mt-2.5 flex min-w-0 items-center gap-2 sm:mt-3 sm:flex-wrap">
            <Select
              v-model="selectedAmount"
              class="w-32 min-w-0 text-xs sm:!hidden"
              :options="amountOptions"
              option-label="label"
              option-value="value"
              size="small"
              :disabled="maxConvertible < exchangeUnit"
              :aria-label="t('duplicateExchange.recycle.duplicates')"
            />
            <SelectButton
              v-model="selectedAmount"
              class="!hidden sm:!inline-flex"
              :options="amountOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              size="small"
            />
            <Button
              class="min-w-0 flex-1 !px-2 !py-2 text-xs sm:min-w-36"
              :label="t('duplicateExchange.recycle.convert', { count: Math.floor(selectedAmount / exchangeUnit) })"
              icon="pi pi-arrow-right-arrow-left"
              size="small"
              :disabled="maxConvertible < exchangeUnit"
              :loading="pickShop.isProcessing"
              @click="convert"
            />
          </div>
          <Button
            class="mt-2 !hidden w-full sm:!flex"
            :label="t('duplicateExchange.recycle.openStore')"
            icon="pi pi-shopping-bag"
            severity="secondary"
            outlined
            @click="router.push({ name: 'shop', query: { section: 'picks' } })"
          />
        </article>
      </div>
      <p v-if="message" class="mt-2 text-xs font-bold text-emerald-700 sm:mt-3 sm:text-sm" role="status">{{ message }}</p>
      <p v-if="error" class="mt-2 text-xs font-bold text-coral sm:mt-3 sm:text-sm" role="alert">{{ t('duplicateExchange.recycle.error') }}</p>
    </div>

    <!-- Группировка сохраняет видимость того, какие именно карточки будут переработаны. -->
    <div v-if="groups.length" class="mt-3 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
      <article
        v-for="group in groups"
        :key="group.key"
        class="relative border-2 border-ink/25 bg-paper p-2"
      >
        <span class="absolute right-3 top-3 z-10 rounded-full bg-coral px-2 py-1 text-xs font-black text-white">
          ×{{ group.instances.length }}
        </span>
        <LoadableImage
          v-if="group.card"
          class="aspect-[2/3] w-full bg-white object-cover"
          :src="group.card.image"
          :alt="group.card.displayName"
          fit="cover"
          defer
        />
        <p class="mt-1 truncate text-xs font-black">{{ group.card?.displayName }}</p>
        <p class="truncate text-[9px] font-black uppercase text-coral">{{ group.albumName }}</p>
      </article>
    </div>
    <div v-else class="mt-3 grid min-h-24 place-items-center border border-dashed border-ink/20 text-center sm:mt-5 sm:min-h-36">
      <div><i class="pi pi-inbox text-2xl text-ink/25 sm:text-3xl" /><p class="mt-1 text-xs font-bold sm:mt-2 sm:text-sm">{{ t('duplicateExchange.recycle.empty') }}</p></div>
    </div>
  </section>
</template>
