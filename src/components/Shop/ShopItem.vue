<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'
import { formatCountdown } from '@/utils/formatCountdown'
import type { BlisterDefinition } from '@/types'

import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import BlisterShopCard from '@/components/Shop/BlisterShopCard.vue'

type ShopSection = 'store' | 'packs' | 'free'

interface Props {
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
}

interface ShopSectionOption {
  value: ShopSection
  label: string
  icon: string
  count?: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  purchase: [blisterId: string]
  play: []
  open: [packId: string]
}>()
const { t } = useI18n()
const activeSection: Ref<ShopSection> = ref('store')
const freeCooldownText: ComputedRef<string> = computed((): string =>
  formatCountdown(props.cooldownRemainingMs),
)
const freeCooldownPeriodText: string = formatCountdown(PACK_HUNT_CONFIG.cooldownMs)
const sectionOptions: ComputedRef<ShopSectionOption[]> = computed(() => [
  { value: 'store', label: t('shop.sections.store'), icon: 'pi pi-shopping-bag' },
  {
    value: 'packs',
    label: t('shop.sections.packs'),
    icon: 'pi pi-box',
    count: props.ownedPackIds.length,
  },
  { value: 'free', label: t('shop.sections.free'), icon: 'pi pi-bolt' },
])
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <SelectButton
      v-model="activeSection"
      class="shop-section-switch shrink-0 self-start"
      :options="sectionOptions"
      option-label="label"
      option-value="value"
      size="small"
      :allow-empty="false"
      :aria-label="t('shop.sections.ariaLabel')"
    >
      <template #option="{ option }">
        <span class="flex items-center gap-2 text-xs font-black sm:text-sm">
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

    <section
      v-else-if="activeSection === 'free'"
      class="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-y-auto border border-dashed border-ink/20 bg-mint/15 p-5 sm:mt-4"
      role="tabpanel"
    >
      <article class="w-full max-w-md border-2 border-ink bg-paper p-5 text-center shadow-[6px_6px_0_rgb(var(--color-gold)/0.6)]">
        <span class="mx-auto grid size-14 place-items-center rounded-full bg-mint text-2xl text-ink">
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
        <strong class="text-3xl font-black tabular-nums sm:text-4xl">{{ ownedPackIds.length }}</strong>
      </div>

      <div v-if="!inventoryLoaded" class="flex min-h-52 items-center justify-center text-sm font-bold text-ink/45">
        <i class="pi pi-spin pi-spinner mr-2" />
        {{ t('shop.inventoryLoading') }}
      </div>
      <div v-else-if="ownedPackIds.length" class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <article
          v-for="(packId, index) in ownedPackIds"
          :key="packId"
          class="border border-ink/15 bg-ink p-2.5 text-paper shadow-[4px_4px_0_rgb(var(--color-mint)/0.6)]"
        >
          <div class="flex aspect-[9/11] items-center justify-center bg-paper/5">
            <div class="flex aspect-[9/14] w-[62%] -rotate-3 flex-col items-center justify-center border border-white/50 bg-[linear-gradient(145deg,#12243d,#14754a_55%,#db5a3c)] px-1 text-center text-white shadow-xl">
              <span class="text-[8px] font-black tracking-[.14em]">{{ t('shop.ownedPackBrand') }}</span>
              <strong class="mt-1 break-words text-sm font-black leading-tight">
                {{ ownedPackDetails[packId]?.label ?? t('shop.wc-26') }}
              </strong>
              <span class="mt-1 text-[8px] font-black opacity-70">
                {{ t('shop.ownedPackContents', { count: ownedPackDetails[packId]?.cardCount ?? 0 }) }}
              </span>
            </div>
          </div>
          <p class="mt-2 truncate text-xs font-black">{{ t('shop.ownedPackNumber', { number: index + 1 }) }}</p>
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
      <div v-else class="flex min-h-52 flex-col items-center justify-center border border-dashed border-ink/20 p-5 text-center">
        <i class="pi pi-box text-3xl text-ink/25" />
        <strong class="mt-3 text-sm">{{ t('shop.emptyPacksTitle') }}</strong>
        <p class="mt-1 max-w-sm text-xs text-ink/50">{{ t('shop.emptyPacksText') }}</p>
      </div>
    </section>
  </div>
</template>
