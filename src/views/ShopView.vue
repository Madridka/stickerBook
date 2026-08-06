<script setup lang="ts">
import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import { usePackHuntStore } from '@/stores/packHunt'
import { useBlistersStore } from '@/stores/blisters'
import { BLISTER_CONFIGS, CARDS_PER_PACK, PACK_PRICE } from '@/config/gameBalance'
import {
  getPlayerAlbumById,
  getPlayerBlisterById,
} from '@/data/albumRegistry'
import {
  purchaseBlister,
  type PurchaseBlisterResult,
} from '@/services/economy'
import type { BlisterDefinition } from '@/types'
import { selectPackMiniGame, type PackMiniGameId } from '@/utils/selectPackMiniGame'
import type { InventoryItem } from '@/db/database'

import ShopItem from '@/components/Shop/ShopItem.vue'
import RareShopPanel from '@/components/Shop/RareShopPanel.vue'
import SelectButton from 'primevue/selectbutton'

type ShopCatalogSection = 'regular' | 'rare'

const { t } = useI18n()
const player = usePlayerStore()
const inventory = useInventoryStore()
const packHunt = usePackHuntStore()
const blisters = useBlistersStore()
const standardBlister: BlisterDefinition | undefined = getPlayerBlisterById(
  BLISTER_CONFIGS.standard.id,
)
const kdvBlister: BlisterDefinition | undefined = getPlayerBlisterById('kdv')
const router = useRouter()
const isPurchasing: Ref<boolean> = ref(false)
const isPurchasingKdv: Ref<boolean> = ref(false)
const hasPurchaseError: Ref<boolean> = ref(false)
const activeCatalogSection: Ref<ShopCatalogSection> = ref('regular')
const catalogSections: ComputedRef<Array<{ value: ShopCatalogSection; label: string }>> =
  computed(() => [
    { value: 'regular', label: t('shop.catalogSections.regular') },
    { value: 'rare', label: t('shop.catalogSections.rare') },
  ])

const resolvePlayerBlister = (blisterId: string): BlisterDefinition | undefined =>
  getPlayerBlisterById(blisterId === 'rare' ? BLISTER_CONFIGS.standard.id : blisterId)

const isPlayerPack = (item: InventoryItem): boolean => {
  if (item.type !== 'pack') return false
  const blister = resolvePlayerBlister(item.packId ?? BLISTER_CONFIGS.standard.id)
  const album = getPlayerAlbumById(
    item.albumId ?? blister?.albumId ?? BLISTER_CONFIGS.standard.albumId,
  )
  return Boolean(blister && album && blister.albumId === album.id)
}

const ownedPackIds: ComputedRef<string[]> = computed(() =>
  inventory.items.filter(isPlayerPack).map(({ id }) => id),
)
const ownedPackDetails: ComputedRef<
  Record<string, { label: string; cardCount: number }>
> = computed(() =>
  Object.fromEntries(
    inventory.items
      .filter(isPlayerPack)
      .map((item): [string, { label: string; cardCount: number }] => {
        const blister = resolvePlayerBlister(item.packId ?? BLISTER_CONFIGS.standard.id)
        const album = getPlayerAlbumById(
          item.albumId ?? blister?.albumId ?? BLISTER_CONFIGS.standard.albumId,
        )
        return [
          item.id,
          {
            label: album ? t(album.shortName) : t('shop.wc-26'),
            cardCount: blister?.cardCount ?? CARDS_PER_PACK,
          },
        ]
      }),
  ),
)

// Покупает пак одной транзакцией и синхронизирует UI только после её фиксации.
const buyPack = async (): Promise<void> => {
  if (!standardBlister || isPurchasing.value || player.coins < standardBlister.cost) return

  isPurchasing.value = true
  hasPurchaseError.value = false
  try {
    try {
      await player.flushSaves()
      const result: PurchaseBlisterResult = await purchaseBlister(standardBlister.id)
      if (result.status !== 'purchased') {
        if (result.player) player.applyPersistedState(result.player)
        hasPurchaseError.value = true
        return
      }

      player.applyPersistedState(result.player)
      inventory.applyPersistedItem(result.item)
      await router.push({ name: 'pack-opening', query: { pack: result.item.id } })
    } catch {
      hasPurchaseError.value = true
      return
    }
  } finally {
    isPurchasing.value = false
  }
}

// Покупает блистер «История Томи» вместе с неизменяемой сессией и запуском кулдауна.
const buyKdvBlister = async (): Promise<void> => {
  if (
    !kdvBlister ||
    isPurchasingKdv.value ||
    player.coins < kdvBlister.cost ||
    blisters.getCooldownRemainingMs(kdvBlister.id) > 0
  ) {
    return
  }
  isPurchasingKdv.value = true
  hasPurchaseError.value = false
  try {
    await player.flushSaves()
    const result: PurchaseBlisterResult = await purchaseBlister(kdvBlister.id)
    if (result.status !== 'purchased') {
      if (result.player) player.applyPersistedState(result.player)
      hasPurchaseError.value = result.status !== 'cooldown'
      await blisters.load()
      return
    }
    player.applyPersistedState(result.player)
    inventory.applyPersistedItem(result.item)
    await blisters.load()
    await router.push({ name: 'pack-opening', query: { pack: result.item.id } })
  } catch {
    hasPurchaseError.value = true
  } finally {
    isPurchasingKdv.value = false
  }
}

const playPackHunt = async (): Promise<void> => {
  if (!packHunt.canPlay) return
  const game: PackMiniGameId = selectPackMiniGame()
  await router.push({ name: 'pack-hunt', query: { game } })
}

const openOwnedPack = async (): Promise<void> => {
  if (!inventory.isLoaded || ownedPackIds.value.length <= 0) return
  await router.push({ name: 'pack-opening' })
}

onMounted(async (): Promise<void> => {
  await Promise.all([packHunt.load(), inventory.load(), blisters.load()])
})
</script>

<template>
  <!-- Основной экран магазина -->
  <section class="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col py-1">
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
          {{ t('shop.coins') }} {{ player.formattedCoins }}
        </p>
      </div>
    </div>

    <!-- Краткое описание ассортимента -->
    <p class="mt-1 hidden text-xs text-ink/55 md:block">{{ t('shop.text') }}</p>

    <SelectButton
      v-model="activeCatalogSection"
      class="mt-3 shrink-0 self-start"
      :options="catalogSections"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      size="small"
      :aria-label="t('shop.catalogSections.ariaLabel')"
    />

    <!-- Доступные товары магазина -->
    <ShopItem
      v-if="activeCatalogSection === 'regular'"
      class="mt-3 sm:mt-4"
      :price="PACK_PRICE"
      :can-buy="player.coins >= PACK_PRICE"
      :purchasing="isPurchasing"
      :cooldown-remaining-ms="packHunt.cooldownRemainingMs"
      :mini-game-loaded="packHunt.isLoaded"
      :owned-pack-ids="ownedPackIds"
      :owned-pack-details="ownedPackDetails"
      :inventory-loaded="inventory.isLoaded"
      :kdv-price="kdvBlister?.cost ?? 0"
      :kdv-can-buy="Boolean(kdvBlister) && player.coins >= (kdvBlister?.cost ?? Infinity)"
      :kdv-purchasing="isPurchasingKdv"
      :kdv-cooldown-remaining-ms="
        kdvBlister ? blisters.getCooldownRemainingMs(kdvBlister.id) : 0
      "
      :kdv-loaded="blisters.isLoaded"
      :kdv-card-count="kdvBlister?.cardCount ?? 0"
      @purchase="buyPack"
      @purchase-kdv="buyKdvBlister"
      @play="playPackHunt"
      @open="openOwnedPack"
    />
    <RareShopPanel v-else />
    <p
      v-if="activeCatalogSection === 'regular' && hasPurchaseError"
      class="mt-4 text-sm font-bold text-coral"
      role="alert"
    >
      {{ t('shop.purchaseError') }}
    </p>
  </section>
</template>
