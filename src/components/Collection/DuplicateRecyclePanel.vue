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

const maxConvertible: ComputedRef<number> = computed(() =>
  Math.floor(collection.duplicateTotal / PICK_SHOP_CONFIG.duplicatesPerToken) *
  PICK_SHOP_CONFIG.duplicatesPerToken,
)
const amountOptions: ComputedRef<Array<{ label: string; value: number }>> = computed(() => {
  const values: number[] = [5, 25, 50, maxConvertible.value]
    .filter((value): boolean => value > 0 && value <= maxConvertible.value)
  return Array.from(new Set(values)).map((value) => ({
    value,
    label: value === maxConvertible.value && value > 50
      ? t('duplicateExchange.recycle.all', { count: value })
      : String(value),
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
    <div class="border-2 border-ink bg-paper p-4 shadow-[5px_5px_0_rgb(var(--color-gold)/0.45)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-coral">
            {{ t('duplicateExchange.recycle.eyebrow') }}
          </p>
          <h2 id="duplicate-recycle-title" class="text-xl font-black">
            {{ t('duplicateExchange.recycle.title') }}
          </h2>
          <p class="mt-1 max-w-2xl text-xs text-ink/60">
            {{ t('duplicateExchange.recycle.description') }}
          </p>
        </div>
        <div class="flex gap-2 text-center">
          <div class="border border-ink/15 px-3 py-2">
            <p class="text-[9px] font-black uppercase text-ink/45">{{ t('duplicateExchange.recycle.duplicates') }}</p>
            <strong class="text-xl tabular-nums">{{ collection.duplicateTotal }}</strong>
          </div>
          <div class="border border-mint bg-mint/20 px-3 py-2">
            <p class="text-[9px] font-black uppercase text-ink/45">{{ t('duplicateExchange.recycle.tokens') }}</p>
            <strong class="text-xl tabular-nums">{{ pickShop.tokens }}</strong>
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <article class="border border-coral/30 bg-coral/5 p-3">
          <strong class="text-sm">{{ t('duplicateExchange.recycle.mixedTitle') }}</strong>
          <p class="mt-1 text-xs text-ink/55">{{ t('duplicateExchange.recycle.mixedText') }}</p>
          <Button
            class="mt-3 w-full"
            :label="t('duplicateExchange.recycle.openMixed')"
            icon="pi pi-sparkles"
            :disabled="collection.duplicateTotal < 5"
            :loading="pickShop.isProcessing"
            @click="openMixedPick"
          />
        </article>
        <article class="border border-mint/70 bg-mint/10 p-3">
          <strong class="text-sm">{{ t('duplicateExchange.recycle.tokensTitle') }}</strong>
          <p class="mt-1 text-xs text-ink/55">{{ t('duplicateExchange.recycle.rate') }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <SelectButton
              v-model="selectedAmount"
              :options="amountOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              size="small"
            />
            <Button
              class="min-w-36 flex-1"
              :label="t('duplicateExchange.recycle.convert', { count: Math.floor(selectedAmount / 5) })"
              icon="pi pi-arrow-right-arrow-left"
              :disabled="maxConvertible < 5"
              :loading="pickShop.isProcessing"
              @click="convert"
            />
          </div>
          <Button
            class="mt-2 w-full"
            :label="t('duplicateExchange.recycle.openStore')"
            icon="pi pi-shopping-bag"
            severity="secondary"
            outlined
            @click="router.push({ name: 'shop', query: { section: 'picks' } })"
          />
        </article>
      </div>
      <p v-if="message" class="mt-3 text-sm font-bold text-emerald-700" role="status">{{ message }}</p>
      <p v-if="error" class="mt-3 text-sm font-bold text-coral" role="alert">{{ t('duplicateExchange.recycle.error') }}</p>
    </div>

    <div v-if="groups.length" class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <article v-for="group in groups" :key="group.key" class="relative border-2 border-ink/25 bg-paper p-2">
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
    <div v-else class="mt-5 grid min-h-36 place-items-center border border-dashed border-ink/20 text-center">
      <div><i class="pi pi-inbox text-3xl text-ink/25" /><p class="mt-2 text-sm font-bold">{{ t('duplicateExchange.recycle.empty') }}</p></div>
    </div>
  </section>
</template>
