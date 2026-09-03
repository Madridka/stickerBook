<script setup lang="ts">
import { computed, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import { usePackHuntStore } from '@/stores/packHunt'
import { usePackOpeningStore } from '@/stores/packOpening'
import { useBlistersStore } from '@/stores/blisters'
import { useCollectionStore } from '@/stores/collection'
import { usePickShopStore } from '@/stores/pickShop'
import { BLISTER_CONFIGS, BLISTER_SHOP_PRIORITY } from '@/config/gameBalance'
import {
  getBlisters,
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

const { t } = useI18n()
const player = usePlayerStore()
const inventory = useInventoryStore()
const packHunt = usePackHuntStore()
const packOpening = usePackOpeningStore()
const blisters = useBlistersStore()
const collection = useCollectionStore()
const pickShop = usePickShopStore()
const availableBlisters: BlisterDefinition[] = [...getBlisters()].sort(
  (left, right): number => {
    const leftPriority: number = BLISTER_SHOP_PRIORITY.indexOf(left.id)
    const rightPriority: number = BLISTER_SHOP_PRIORITY.indexOf(right.id)
    return (leftPriority < 0 ? Number.MAX_SAFE_INTEGER : leftPriority) -
      (rightPriority < 0 ? Number.MAX_SAFE_INTEGER : rightPriority)
  },
)
const router = useRouter()
const initialShopSection: 'store' | 'picks' =
  router.currentRoute.value.query.section === 'picks' ? 'picks' : 'store'
const purchasingById: Ref<Record<string, boolean>> = ref({})
const hasPurchaseError: Ref<boolean> = ref(false)
const hasPickError: Ref<boolean> = ref(false)

const resolvePlayerBlister = (blisterId: string): BlisterDefinition | undefined =>
  getPlayerBlisterById(blisterId)

const isPlayerPack = (item: InventoryItem): boolean => {
  if (item.type !== 'pack') return false
  const blister = resolvePlayerBlister(item.packId ?? BLISTER_CONFIGS.standard.id)
  const album = getPlayerAlbumById(
    item.albumId ?? blister?.albumId ?? BLISTER_CONFIGS.standard.albumId,
  )
  return Boolean(blister && album && blister.albumIds.includes(album.id))
}

const ownedPackIds: ComputedRef<string[]> = computed(() =>
  inventory.items
    .filter((item): boolean => isPlayerPack(item) && item.id !== packOpening.session?.packId)
    .map(({ id }) => id),
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
            label: blister ? t(blister.shortNameKey) : album ? t(album.shortName) : t('shop.wc-26'),
            cardCount: blister?.cardCount ?? 0,
          },
        ]
      }),
  ),
)

const cooldownRemainingById: ComputedRef<Record<string, number>> = computed(() =>
  Object.fromEntries(
    availableBlisters.map((blister): [string, number] => [
      blister.id,
      blisters.getCooldownRemainingMs(blister.id),
    ]),
  ),
)

// Единый поток покупки работает для любого блистера из реестра журналов.
const buyBlister = async (blisterId: string): Promise<void> => {
  const blister: BlisterDefinition | undefined = getPlayerBlisterById(blisterId)
  if (
    !blister ||
    purchasingById.value[blisterId] ||
    player.coins < blister.cost ||
    blisters.getCooldownRemainingMs(blisterId) > 0
  ) return

  purchasingById.value = { ...purchasingById.value, [blisterId]: true }
  hasPurchaseError.value = false
  try {
    await player.flushSaves()
    const result: PurchaseBlisterResult = await purchaseBlister(blister.id)
    if (result.status !== 'purchased') {
      if (result.player) player.applyPersistedState(result.player)
      hasPurchaseError.value = result.status !== 'cooldown'
      await blisters.load()
      return
    }
    player.applyPersistedState(result.player)
    inventory.applyPersistedItem(result.item)
    packOpening.applyPersistedSession(result.session)
    await blisters.load()
    await router.push({ name: 'pack-opening', query: { pack: result.item.id } })
  } catch {
    hasPurchaseError.value = true
  } finally {
    purchasingById.value = { ...purchasingById.value, [blisterId]: false }
  }
}

const playPackHunt = async (): Promise<void> => {
  if (!packHunt.canPlay) return
  const game: PackMiniGameId = selectPackMiniGame(packHunt.recentGameIds)
  await router.push({ name: 'pack-hunt', query: { game } })
}

const openOwnedPack = async (packId: string): Promise<void> => {
  if (!inventory.isLoaded || !ownedPackIds.value.includes(packId)) return
  await router.push({ name: 'pack-opening', query: { pack: packId } })
}

const openPick = async (offerId: string): Promise<void> => {
  hasPickError.value = false
  const result = await pickShop.beginPick(offerId)
  hasPickError.value = result !== 'started'
}

onMounted(async (): Promise<void> => {
  await Promise.all([
    packHunt.load(),
    packOpening.load(),
    inventory.load(),
    blisters.load(),
    collection.load(),
    pickShop.load(),
  ])
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

    <!-- Доступные товары магазина -->
    <ShopItem
      class="mt-3 sm:mt-4"
      :initial-section="initialShopSection"
      :blisters="availableBlisters"
      :player-coins="player.coins"
      :purchasing-by-id="purchasingById"
      :cooldown-remaining-by-id="cooldownRemainingById"
      :blisters-loaded="blisters.isLoaded"
      :cooldown-remaining-ms="packHunt.cooldownRemainingMs"
      :mini-game-loaded="packHunt.isLoaded"
      :owned-pack-ids="ownedPackIds"
      :owned-pack-details="ownedPackDetails"
      :inventory-loaded="inventory.isLoaded"
      :pick-offers="pickShop.offers"
      :pick-tokens="pickShop.tokens"
      :pick-missing-counts="pickShop.offerMissingCounts"
      :picks-loaded="pickShop.isLoaded && collection.isLoaded"
      :pick-processing="pickShop.isProcessing"
      @purchase="buyBlister"
      @play="playPackHunt"
      @open="openOwnedPack"
      @pick="openPick"
    />
    <p
      v-if="hasPurchaseError"
      class="mt-4 text-sm font-bold text-coral"
      role="alert"
    >
      {{ t('shop.purchaseError') }}
    </p>
    <p v-if="hasPickError" class="mt-4 text-sm font-bold text-coral" role="alert">
      {{ t('shop.pickError') }}
    </p>
  </section>
</template>
