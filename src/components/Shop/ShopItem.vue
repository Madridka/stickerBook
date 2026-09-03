<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PICK_SHOP_CONFIG } from '@/config/gameBalance'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'
import { formatCountdown } from '@/utils/formatCountdown'
import type { BlisterDefinition, PickShopOffer } from '@/types'

import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import BlisterShopCard from '@/components/Shop/BlisterShopCard.vue'

type ShopSection = 'store' | 'picks' | 'packs' | 'free'
type PickViewTab = 'standard' | 'premium' | 'all'

interface Props {
  initialSection?: ShopSection
  blisters: BlisterDefinition[]
  playerCoins: number
  purchasingById: Readonly<Record<string, boolean>>
  cooldownRemainingById: Readonly<Record<string, number>>
  blistersLoaded: boolean
  cooldownRemainingMs: number
  miniGameLoaded: boolean
  ownedPackIds: string[]
  ownedPackDetails: Record<string, { label: string; cardCount: number }>
  inventoryLoaded: boolean
  pickOffers: readonly PickShopOffer[]
  pickTokens: number
  pickMissingCounts: Readonly<Record<string, number>>
  picksLoaded: boolean
  pickProcessing: boolean
}

interface ShopSectionOption {
  value: ShopSection
  label: string
  icon: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), { initialSection: 'store' })
const emit = defineEmits<{
  purchase: [blisterId: string]
  play: []
  open: [packId: string]
  pick: [offerId: string]
}>()
const { t } = useI18n()
const activeSection: Ref<ShopSection> = ref(props.initialSection)
const activePickTab: Ref<PickViewTab> = ref('standard')
const pickCandidateCount: number = PICK_SHOP_CONFIG.candidateCount
const freeCooldownText: ComputedRef<string> = computed((): string =>
  formatCountdown(props.cooldownRemainingMs),
)
const freeCooldownPeriodText: string = formatCountdown(PACK_HUNT_CONFIG.cooldownMs)
const sectionOptions: ComputedRef<ShopSectionOption[]> = computed(() => [
  { value: 'store', label: t('shop.sections.store'), icon: 'pi pi-shopping-bag' },
  { value: 'picks', label: t('shop.sections.picks'), icon: 'pi pi-sparkles' },
  {
    value: 'packs',
    label: t('shop.sections.packs'),
    icon: 'pi pi-box',
    count: props.ownedPackIds.length,
  },
  { value: 'free', label: t('shop.sections.free'), icon: 'pi pi-bolt' },
])
const pickTabOptions: ComputedRef<{ value: PickViewTab; label: string }[]> = computed(
  () => [
    { value: 'standard', label: t('shop.pickTabs.standard') },
    { value: 'premium', label: t('shop.pickTabs.premium') },
    { value: 'all', label: t('shop.pickTabs.all') },
  ],
)
const visiblePickOffers: ComputedRef<readonly PickShopOffer[]> = computed(() =>
  activePickTab.value === 'all'
    ? props.pickOffers
    : props.pickOffers.filter(({ tier }): boolean => tier === activePickTab.value),
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="w-full shrink-0 overflow-x-auto overscroll-x-contain pb-1">
      <SelectButton
        v-model="activeSection"
        class="shop-section-switch w-max min-w-full"
        :options="sectionOptions"
        option-label="label"
        option-value="value"
        size="small"
        :allow-empty="false"
        :aria-label="t('shop.sections.ariaLabel')"
      >
        <template #option="{ option }">
          <span class="flex items-center gap-2 whitespace-nowrap text-xs font-black sm:text-sm">
            <i :class="option.icon" />
            <span>{{ option.label }}</span>
            <span
              v-if="option.count !== undefined"
              class="min-w-5 rounded-full bg-current/10 px-1.5 py-0.5 text-center text-[10px] tabular-nums"
            >
              {{ option.count }}
            </span>
          </span>
        </template>
      </SelectButton>
    </div>

    <div
      v-if="activeSection === 'store'"
      class="mt-3 grid min-h-0 flex-1 auto-rows-max grid-cols-2 gap-3 overflow-y-auto px-1 pb-2 sm:mt-4 sm:grid-cols-3 lg:grid-cols-5"
      role="tabpanel"
    >
      <BlisterShopCard
        v-for="blister in blisters"
        :key="blister.id"
        :blister="blister"
        :can-buy="playerCoins >= blister.cost"
        :purchasing="purchasingById[blister.id] === true"
        :cooldown-remaining-ms="cooldownRemainingById[blister.id] ?? 0"
        :loaded="blistersLoaded"
        @purchase="emit('purchase', blister.id)"
      />
    </div>

    <!-- Отдельная витрина пиков показывает стоимость и остаток коллекции до покупки. -->
    <section
      v-else-if="activeSection === 'picks'"
      class="mt-3 min-h-0 flex-1 overflow-y-auto sm:mt-4"
      role="tabpanel"
    >
      <div class="mb-3 flex items-start justify-between gap-3 border border-mint/70 bg-mint/15 p-3">
        <div class="min-w-0">
          <h2 class="text-lg font-black sm:text-xl">
            {{ t('shop.pickStoreTitle', { count: pickCandidateCount }) }}
          </h2>
          <p class="mt-1 line-clamp-2 max-w-2xl text-[11px] leading-relaxed text-ink/60 sm:text-xs">
            {{ t('shop.pickStoreText', { count: pickCandidateCount }) }}
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1.5 text-right sm:block">
          <i class="pi pi-sparkles text-xs text-coral sm:hidden" aria-hidden="true" />
          <p class="sr-only sm:not-sr-only sm:text-[9px] sm:font-black sm:uppercase sm:text-ink/45">{{ t('shop.pickTokens') }}</p>
          <strong class="text-xl font-black leading-none tabular-nums sm:text-3xl">{{ pickTokens }}</strong>
        </div>
      </div>

      <div class="mb-3 w-full overflow-x-auto overscroll-x-contain pb-1">
        <SelectButton
          v-model="activePickTab"
          class="shop-section-switch w-max min-w-full"
          :options="pickTabOptions"
          option-label="label"
          option-value="value"
          size="small"
          :allow-empty="false"
          :aria-label="t('shop.pickTabs.ariaLabel')"
        />
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <article
          v-for="offer in visiblePickOffers"
          :key="offer.id"
          class="flex min-h-48 flex-col border-2 border-ink/30 bg-paper p-3 shadow-[3px_3px_0_rgb(var(--color-ink)/0.1)] sm:min-h-52 sm:shadow-[4px_4px_0_rgb(var(--color-ink)/0.1)]"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="grid size-9 shrink-0 place-items-center bg-ink text-base text-paper">
              <i
                :class="
                  offer.tier === 'premium'
                    ? 'pi pi-star'
                    : offer.kind === 'random'
                      ? 'pi pi-directions-alt'
                      : 'pi pi-book'
                "
              />
            </span>
            <strong class="text-base tabular-nums sm:text-lg">
              {{ t('shop.pickCost', { cost: offer.cost }) }}
            </strong>
          </div>
          <h3 class="mt-3 text-sm font-black leading-tight sm:text-base">{{ t(offer.titleKey) }}</h3>
          <p class="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink/55 sm:text-xs">
            {{ t(offer.descriptionKey, { count: pickCandidateCount }) }}
          </p>
          <div class="mt-2 space-y-1 text-[9px] font-black uppercase sm:text-[10px]">
            <p v-if="offer.guaranteedNew" class="text-emerald-700">
              <i class="pi pi-check-circle mr-1" />{{ t('shop.pickGuaranteed') }}
            </p>
            <p v-if="offer.guaranteedNew && picksLoaded" class="text-ink/45">
              {{
                pickMissingCounts[offer.id] > 0
                  ? t('shop.pickMissing', { count: pickMissingCounts[offer.id] })
                  : t('shop.pickCompleted')
              }}
            </p>
          </div>
          <Button
            class="mt-auto w-full !px-2 !py-2 text-[10px] sm:!px-3 sm:text-xs"
            :label="t('shop.pickBuy', { cost: offer.cost })"
            icon="pi pi-sparkles"
            size="small"
            :disabled="
              !picksLoaded ||
              pickTokens < offer.cost ||
              (offer.guaranteedNew && pickMissingCounts[offer.id] === 0)
            "
            :loading="pickProcessing"
            @click="emit('pick', offer.id)"
          />
        </article>
      </div>
    </section>

    <section
      v-else-if="activeSection === 'free'"
      class="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-y-auto border border-dashed border-ink/20 bg-mint/15 p-5 sm:mt-4"
      role="tabpanel"
    >
      <article
        class="w-full max-w-md border-2 border-ink bg-paper p-5 text-center shadow-[6px_6px_0_rgb(var(--color-gold)/0.6)]"
      >
        <span
          class="mx-auto grid size-14 place-items-center rounded-full bg-mint text-2xl text-ink"
        >
          <i class="pi pi-bolt" aria-hidden="true" />
        </span>
        <p class="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-coral">
          {{ t('shop.freeKicker') }}
        </p>
        <h2 class="mt-1 text-2xl font-black">{{ t('shop.freeTitle') }}</h2>
        <p class="mt-2 text-sm text-ink/60">
          {{
            cooldownRemainingMs === 0
              ? t('shop.gameAvailable')
              : t('shop.cooldownRemaining', { time: freeCooldownText })
          }}
        </p>
        <p class="mt-1 text-xs font-bold text-ink/45">
          {{ t('shop.cooldownPack', { time: freeCooldownPeriodText }) }}
        </p>
        <Button
          class="mt-4 w-full"
          :label="t('shop.getFree')"
          icon="pi pi-bolt"
          :disabled="!miniGameLoaded || cooldownRemainingMs > 0"
          type="button"
          @click="emit('play')"
        />
      </article>
    </section>

    <section
      v-else
      class="mt-3 min-h-0 flex-1 overflow-y-auto border border-ink/15 bg-paper/70 p-4 sm:mt-4 sm:p-5"
      role="tabpanel"
    >
      <div class="flex items-end justify-between gap-4 border-b border-ink/10 pb-3">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-coral">
            {{ t('shop.inventory') }}
          </p>
          <h2 class="mt-0.5 text-xl font-black sm:text-2xl">{{ t('shop.inventoryTitle') }}</h2>
          <p class="mt-1 hidden text-xs text-ink/55 sm:block">{{ t('shop.inventoryText') }}</p>
        </div>
        <strong class="text-3xl font-black tabular-nums sm:text-4xl">{{
          ownedPackIds.length
        }}</strong>
      </div>

      <div
        v-if="!inventoryLoaded"
        class="flex min-h-52 items-center justify-center text-sm font-bold text-ink/45"
      >
        <i class="pi pi-spin pi-spinner mr-2" />
        {{ t('shop.inventoryLoading') }}
      </div>
      <div
        v-else-if="ownedPackIds.length"
        class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        <article
          v-for="(packId, index) in ownedPackIds"
          :key="packId"
          class="border border-ink/15 bg-ink p-2.5 text-paper shadow-[4px_4px_0_rgb(var(--color-mint)/0.6)]"
        >
          <div class="flex aspect-[9/11] items-center justify-center bg-paper/5">
            <div
              class="flex aspect-[9/14] w-[62%] -rotate-3 flex-col items-center justify-center border border-white/50 bg-[linear-gradient(145deg,#12243d,#14754a_55%,#db5a3c)] px-1 text-center text-white shadow-xl"
            >
              <span class="text-[8px] font-black tracking-[.14em]">{{
                t('shop.ownedPackBrand')
              }}</span>
              <strong class="mt-1 break-words text-sm font-black leading-tight">
                {{ ownedPackDetails[packId]?.label ?? t('shop.wc-26') }}
              </strong>
              <span class="mt-1 text-[8px] font-black opacity-70">
                {{
                  t('shop.ownedPackContents', { count: ownedPackDetails[packId]?.cardCount ?? 0 })
                }}
              </span>
            </div>
          </div>
          <p class="mt-2 truncate text-xs font-black">
            {{ t('shop.ownedPackNumber', { number: index + 1 }) }}
          </p>
          <Button
            class="mt-2 w-full !border-paper !bg-paper !text-ink text-xs"
            :label="t('shop.openOwnedPack')"
            icon="pi pi-gift"
            size="small"
            type="button"
            @click="emit('open', packId)"
          />
        </article>
      </div>
      <div
        v-else
        class="flex min-h-52 flex-col items-center justify-center border border-dashed border-ink/20 p-5 text-center"
      >
        <i class="pi pi-box text-3xl text-ink/25" />
        <strong class="mt-3 text-sm">{{ t('shop.emptyPacksTitle') }}</strong>
        <p class="mt-1 max-w-sm text-xs text-ink/50">{{ t('shop.emptyPacksText') }}</p>
      </div>
    </section>
  </div>
</template>
