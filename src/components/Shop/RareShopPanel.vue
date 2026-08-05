<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CLOCK_CONFIG, RARE_SHOP_CONFIG } from '@/data/mainConst'
import albumContentsTeams, { type AlbumContentsTeam } from '@/data/wc-26/contents'
import { useInventoryStore } from '@/stores/inventory'
import { usePlayerStore } from '@/stores/player'
import { useRareShopStore } from '@/stores/rareShop'
import { getRareOfferStatus } from '@/features/rareShop/rareShopDomain'
import type {
  RareBlisterExtensionStatus,
  RareBlisterOffer,
  RareBlisterOfferStatus,
} from '@/features/rareShop/types'
import { getLocalDateKey } from '@/utils/dailyDateKey'
import { formatCountdown } from '@/utils/formatCountdown'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import ProgressBar from 'primevue/progressbar'
import LoadableImage from '@/components/ui/LoadableImage.vue'

const { t } = useI18n()
const router = useRouter()
const player = usePlayerStore()
const inventory = useInventoryStore()
const rareShop = useRareShopStore()
const now: Ref<number> = ref(Date.now())
const showInfo: Ref<boolean> = ref(false)
const errorKey: Ref<string | null> = ref(null)
let timerId: ReturnType<typeof setInterval> | undefined
const rotationDuration: string = formatCountdown(RARE_SHOP_CONFIG.rotationDurationMs)
const extensionDuration: string = formatCountdown(RARE_SHOP_CONFIG.extensionDurationMs)

const teamById: ReadonlyMap<string, AlbumContentsTeam> = new Map(
  albumContentsTeams.map((team: AlbumContentsTeam): [string, AlbumContentsTeam] => [team.id, team]),
)
const visibleOffers: ComputedRef<RareBlisterOffer[]> = computed((): RareBlisterOffer[] => {
  const offers: RareBlisterOffer[] = [...rareShop.currentOffers]
  for (const offer of rareShop.extendedOffers) {
    if (offer.rotationId !== rareShop.state.currentRotation?.id) offers.push(offer)
  }
  return offers
})
const rotationRemaining: ComputedRef<string> = computed((): string =>
  formatCountdown((rareShop.state.currentRotation?.expiresAt ?? now.value) - now.value),
)
const extensionUsedToday: ComputedRef<boolean> = computed(
  (): boolean => rareShop.state.lastExtensionDate === getLocalDateKey(now.value),
)

const teamFor = (countryId: string): AlbumContentsTeam | undefined => teamById.get(countryId)
const statusFor = (offer: RareBlisterOffer): RareBlisterOfferStatus =>
  getRareOfferStatus(offer, now.value)
const remainingFor = (offer: RareBlisterOffer): string =>
  formatCountdown((offer.extendedUntil ?? offer.expiresAt) - now.value)
const progressFor = (
  offer: RareBlisterOffer,
): { ownedCards: number; totalCards: number; percent: number } => {
  const progress = rareShop.countryProgress(offer.countryId)
  return {
    ...progress,
    percent: progress.totalCards ? (progress.ownedCards / progress.totalCards) * 100 : 0,
  }
}
const canExtend = (offer: RareBlisterOffer): boolean =>
  statusFor(offer) === 'available' &&
  offer.rotationId === rareShop.state.currentRotation?.id &&
  offer.extendedUntil === null &&
  !extensionUsedToday.value

// Покупает предложение и передаёт заранее сохранённую сессию штатному экрану открытия.
const buyOffer = async (offer: RareBlisterOffer): Promise<void> => {
  errorKey.value = null
  await player.flushSaves()
  const result = await rareShop.purchaseOffer(offer.id)
  if (result.status === 'purchased' && result.player && result.item) {
    player.applyPersistedState(result.player)
    inventory.applyPersistedItem(result.item)
    await router.push({ name: 'pack-opening' })
    return
  }
  errorKey.value =
    result.status === 'insufficient-funds'
      ? 'shop.rare.insufficientFunds'
      : result.status === 'opening-in-progress'
        ? 'shop.rare.openingInProgress'
        : 'shop.rare.purchaseError'
}

const extendOffer = async (offer: RareBlisterOffer): Promise<void> => {
  errorKey.value = null
  const status: RareBlisterExtensionStatus = await rareShop.extendOffer(offer.id)
  if (status === 'extended') return
  errorKey.value =
    status === 'already-used-today' ? 'shop.rare.extensionUsed' : 'shop.rare.extensionUnavailable'
}

const closeInfo = async (): Promise<void> => {
  showInfo.value = false
  await rareShop.markInfoSeen()
}

// Секундный тик меняет только текст таймеров; store вызывается на границе ротации.
const updateClock = async (): Promise<void> => {
  now.value = Date.now()
  const rotationExpiresAt: number = rareShop.state.currentRotation?.expiresAt ?? 0
  const hasExpiredExtension: boolean = rareShop.extendedOffers.some(
    (offer: RareBlisterOffer): boolean => now.value >= (offer.extendedUntil ?? offer.expiresAt),
  )
  if ((rotationExpiresAt > 0 && now.value >= rotationExpiresAt) || hasExpiredExtension) {
    await rareShop.refresh(now.value)
  }
}

onMounted(async (): Promise<void> => {
  await rareShop.load()
  showInfo.value = !rareShop.state.hasSeenRareShopInfo
  timerId = setInterval((): void => {
    void updateClock()
  }, CLOCK_CONFIG.refreshIntervalMs)
})

onBeforeUnmount((): void => {
  if (timerId) clearInterval(timerId)
})
</script>

<template>
  <section class="mt-3 flex min-h-0 flex-1 flex-col sm:mt-4" data-rare-shop>
    <!-- Заголовок ротации и повторный вызов справки -->
    <div
      class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2"
    >
      <div>
        <p class="text-xs font-black text-coral">
          {{ t('shop.rare.nextRotation', { time: rotationRemaining }) }}
        </p>
        <p class="text-[11px] text-ink/55">
          {{
            t('shop.rare.rotationHint', {
              count: RARE_SHOP_CONFIG.offersPerRotation,
              time: rotationDuration,
            })
          }}
        </p>
      </div>
      <Button
        :label="t('shop.rare.infoAction')"
        icon="pi pi-info-circle"
        text
        size="small"
        type="button"
        @click="showInfo = true"
      />
    </div>

    <!-- Три предложения ротации и дополнительное продлённое предложение -->
    <div
      v-if="rareShop.isLoaded"
      class="mt-3 grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 lg:grid-cols-3"
    >
      <article
        v-for="offer in visibleOffers"
        :key="offer.id"
        class="relative flex min-h-[19rem] flex-col overflow-hidden border border-ink/15 bg-paper p-3 shadow-[4px_4px_0_rgb(var(--color-mint)/0.45)]"
        :class="{ 'opacity-60': statusFor(offer) !== 'available' }"
        :data-rare-offer-id="offer.id"
      >
        <div class="flex items-start gap-3">
          <LoadableImage
            v-if="teamFor(offer.countryId)"
            :src="teamFor(offer.countryId)?.flag"
            :alt="t(teamFor(offer.countryId)?.nameKey ?? '')"
            class="h-10 w-14 shrink-0 border border-ink/15"
            fit="cover"
          />
          <div class="min-w-0">
            <p class="truncate text-[10px] font-black uppercase tracking-[0.16em] text-coral">
              {{ t(teamFor(offer.countryId)?.nameKey ?? '') }}
            </p>
            <h2 class="text-lg font-black leading-tight">
              {{
                t('shop.rare.offerTitle', {
                  country: t(teamFor(offer.countryId)?.nameKey ?? ''),
                })
              }}
            </h2>
          </div>
        </div>

        <div class="mt-3 space-y-2 text-xs">
          <p class="font-bold">
            <i class="pi pi-images mr-1 text-coral" />
            {{ t('shop.rare.cardsCount', { count: offer.cardsCount }) }}
          </p>
          <div>
            <div class="mb-1 flex justify-between font-bold">
              <span>{{ t('shop.rare.collected') }}</span>
              <span class="tabular-nums">
                {{ progressFor(offer).ownedCards }} / {{ progressFor(offer).totalCards }}
              </span>
            </div>
            <ProgressBar :value="progressFor(offer).percent" :show-value="false" class="h-2" />
          </div>
          <p
            v-if="progressFor(offer).ownedCards === progressFor(offer).totalCards"
            class="font-black text-ink/55"
          >
            {{ t('shop.rare.collectionComplete') }}
          </p>
          <p v-else class="font-black text-mint-700">
            {{ t('shop.rare.missingChance') }}
          </p>
          <p class="font-bold tabular-nums">
            <i class="pi pi-clock mr-1" />
            {{
              offer.extendedUntil
                ? t('shop.rare.extendedRemaining', { time: remainingFor(offer) })
                : t('shop.rare.remaining', { time: remainingFor(offer) })
            }}
          </p>
        </div>

        <div class="mt-auto pt-3">
          <Button
            class="w-full"
            :label="
              statusFor(offer) === 'purchased'
                ? t('shop.rare.purchased')
                : statusFor(offer) === 'expired'
                  ? t('shop.rare.expired')
                  : t('shop.rare.buyFor', { price: offer.price })
            "
            icon="pi pi-shopping-bag"
            :disabled="
              statusFor(offer) !== 'available' ||
              player.coins < offer.price ||
              rareShop.pendingOfferId !== null
            "
            :loading="rareShop.pendingOfferId === offer.id"
            size="small"
            type="button"
            @click="buyOffer(offer)"
          />
          <Button
            v-if="
              statusFor(offer) === 'available' &&
              offer.rotationId === rareShop.state.currentRotation?.id
            "
            class="mt-1.5 w-full"
            :label="
              extensionUsedToday
                ? t('shop.rare.extensionUsed')
                : offer.extendedUntil
                  ? t('shop.rare.extended')
                  : t('shop.rare.extend', { time: extensionDuration })
            "
            icon="pi pi-hourglass"
            outlined
            :disabled="!canExtend(offer)"
            size="small"
            type="button"
            @click="extendOffer(offer)"
          />
        </div>
      </article>
    </div>
    <div
      v-else
      class="flex min-h-52 flex-1 items-center justify-center text-sm font-bold text-ink/45"
    >
      <i class="pi pi-spin pi-spinner mr-2" />
      {{ t('shop.rare.loading') }}
    </div>

    <p v-if="errorKey" class="mt-2 shrink-0 text-sm font-bold text-coral" role="alert">
      {{ t(errorKey) }}
    </p>

    <!-- Одноразовая справка остаётся доступна вручную после первого просмотра -->
    <Dialog
      v-model:visible="showInfo"
      modal
      :header="t('shop.rare.infoTitle')"
      :closable="false"
      :close-on-escape="false"
      class="w-[min(92vw,34rem)]"
    >
      <div class="space-y-3 text-sm leading-relaxed text-ink/70">
        <p>{{ t('shop.rare.infoParagraph1') }}</p>
        <p>
          {{
            t('shop.rare.infoParagraph2', {
              count: RARE_SHOP_CONFIG.cardsPerPack,
            })
          }}
        </p>
        <p>
          {{ t('shop.rare.infoParagraph3') }}
        </p>
        <p>{{ t('shop.rare.infoParagraph4', { time: rotationDuration }) }}</p>
        <p>{{ t('shop.rare.infoParagraph5', { price: RARE_SHOP_CONFIG.price }) }}</p>
        <p>{{ t('shop.rare.infoParagraph6', { time: extensionDuration }) }}</p>
      </div>
      <template #footer>
        <Button :label="t('shop.rare.infoConfirm')" type="button" @click="closeInfo" />
      </template>
    </Dialog>
  </section>
</template>
