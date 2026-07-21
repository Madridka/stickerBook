<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCountdown } from '@/utils/formatCountdown'

import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'

type ShopSection = 'store' | 'packs'

interface Props {
  price: number
  canBuy: boolean
  purchasing?: boolean
  cooldownRemainingMs: number
  miniGameLoaded: boolean
  ownedPackIds: string[]
  inventoryLoaded: boolean
}

interface ShopSectionOption {
  value: ShopSection
  label: string
  icon: string
  count?: number
}

const props: Props = withDefaults(defineProps<Props>(), { purchasing: false })
const emit = defineEmits<{ purchase: []; play: []; open: [] }>()
const { t } = useI18n()
const activeSection: Ref<ShopSection> = ref('store')

const formattedPrice: ComputedRef<string> = computed(() => props.price.toLocaleString('ru-RU'))
const cooldownText: ComputedRef<string> = computed((): string =>
  formatCountdown(props.cooldownRemainingMs),
)
const sectionOptions: ComputedRef<ShopSectionOption[]> = computed(() => [
  {
    value: 'store',
    label: t('shop.sections.store'),
    icon: 'pi pi-shopping-bag',
  },
  {
    value: 'packs',
    label: t('shop.sections.packs'),
    icon: 'pi pi-box',
    count: props.ownedPackIds.length,
  },
])

const handlePurchase = (): void => emit('purchase')
const handlePlay = (): void => emit('play')
const handleOpen = (): void => emit('open')
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
      class="mt-3 grid min-h-0 flex-1 grid-cols-2 place-content-center gap-3 sm:mt-4 sm:gap-5"
      role="tabpanel"
    >
      <article
        class="relative isolate flex aspect-[9/16] w-full max-w-[14rem] flex-col justify-self-end overflow-hidden bg-ink p-3 text-paper shadow-[6px_6px_0_rgb(var(--color-coral)/0.42)] before:pointer-events-none before:absolute before:h-[42%] before:-rotate-[18deg] before:bg-coral/[.92] before:[inset:18%_-45%_auto_28%] before:content-[''] after:pointer-events-none after:absolute after:h-[12%] after:-rotate-[18deg] after:border-y after:border-paper/[.22] after:[inset:42%_-28%_auto_-38%] after:content-[''] sm:p-4"
      >
        <div class="relative z-10 flex items-center justify-between gap-2">
          <p class="text-[9px] font-black uppercase tracking-[0.2em] text-coral sm:text-[10px]">
            {{ t('shop.paidKicker') }}
          </p>
          <span
            class="border border-paper/25 bg-paper/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider sm:text-[9px]"
          >
            {{ t('shop.packContents') }}
          </span>
        </div>

        <div class="relative z-10 flex min-h-0 flex-1 items-center justify-center py-1 mt-10">
          <div
            class="relative flex aspect-[9/14] w-[min(78%,8.35rem)] -rotate-3 flex-col items-center justify-center overflow-hidden border border-white/[.55] bg-[linear-gradient(145deg,rgb(var(--color-gold)),rgb(var(--color-coral))_55%,#9e2e51)] text-white shadow-[0_12px_22px_rgb(0_0_0/.25)] [clip-path:polygon(4%_0,96%_0,100%_3%,97%_6%,100%_9%,97%_12%,100%_15%,97%_18%,100%_21%,97%_24%,100%_27%,97%_30%,100%_33%,97%_36%,100%_39%,97%_42%,100%_45%,97%_48%,100%_51%,97%_54%,100%_57%,97%_60%,100%_63%,97%_66%,100%_69%,97%_72%,100%_75%,97%_78%,100%_81%,97%_84%,100%_87%,97%_90%,100%_94%,96%_100%,4%_100%,0_94%,3%_90%,0_87%,3%_84%,0_81%,3%_78%,0_75%,3%_72%,0_69%,3%_66%,0_63%,3%_60%,0_57%,3%_54%,0_51%,3%_48%,0_45%,3%_42%,0_39%,3%_36%,0_33%,3%_30%,0_27%,3%_24%,0_21%,3%_18%,0_15%,3%_12%,0_9%,3%_6%,0_3%)] before:absolute before:inset-x-0 before:top-[6%] before:h-0.5 before:border-y before:border-dashed before:border-white/[.58] before:content-[''] after:absolute after:h-[28%] after:-rotate-[28deg] after:bg-white/[.18] after:[inset:auto_-45%_12%_24%] after:content-['']"
          >
            <span
              class="relative z-[1] text-[clamp(.55rem,1.2vw,.79rem)] font-black tracking-[.16em]"
              >{{ t('shop.pointsPackName') }}</span
            >
            <strong
              class="relative z-[1] text-[clamp(1.25rem,4vw,2.2rem)] font-[950] leading-none tracking-[-.08em]"
              >{{ t('shop.wc-26') }}</strong
            >
          </div>
        </div>

        <div class="relative z-10">
          <h2 class="text-base font-black leading-none tracking-tight sm:text-xl">
            {{ t('shop.paidTitle') }}
          </h2>
          <p class="mt-1 hidden text-[10px] leading-snug text-paper/65 sm:block">
            {{ t('shop.paidDescription') }}
          </p>
          <Button
            class="mt-2 w-full !border-paper !bg-paper !text-ink text-[11px] hover:!border-coral hover:!bg-coral hover:!text-white sm:mt-3 sm:text-sm"
            :label="t('shop.buyFor', { price: formattedPrice })"
            icon="pi pi-shopping-bag"
            :disabled="!canBuy || purchasing"
            :loading="purchasing"
            type="button"
            @click="handlePurchase"
          />
        </div>
      </article>

      <article
        class="relative isolate flex aspect-[9/16] w-full max-w-[14rem] flex-col justify-self-start overflow-hidden bg-mint p-3 text-ink shadow-[6px_6px_0_rgb(var(--color-gold)/0.55)] before:pointer-events-none before:absolute before:h-[58%] before:rotate-[22deg] before:bg-gold/[.78] before:[inset:-10%_-60%_auto_10%] before:content-[''] after:pointer-events-none after:absolute after:-right-[12%] after:top-[42%] after:aspect-square after:w-[70%] after:rounded-full after:border after:border-ink/[.14] after:shadow-[0_0_0_1rem_rgb(var(--color-paper)/0.12),0_0_0_2rem_rgb(var(--color-paper)/0.08)] after:content-[''] sm:p-4"
      >
        <div class="relative z-10 flex items-center justify-between gap-2">
          <p class="text-[9px] font-black uppercase tracking-[0.2em] text-ink/60 sm:text-[10px]">
            {{ t('shop.freeKicker') }}
          </p>
          <span
            class="border border-ink/20 bg-paper/35 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider sm:text-[9px]"
          >
            {{ t('shop.packContents') }}
          </span>
        </div>

        <div class="relative z-10 flex min-h-0 flex-1 items-center justify-center py-2">
          <div
            class="relative flex aspect-[9/14] w-[min(78%,8.35rem)] rotate-3 flex-col items-center justify-center overflow-hidden border border-white/[.55] bg-[linear-gradient(145deg,rgb(var(--color-ink)),#284f58_60%,rgb(var(--color-coral)))] text-white shadow-[0_12px_22px_rgb(0_0_0/.25)] [clip-path:polygon(4%_0,96%_0,100%_3%,97%_6%,100%_9%,97%_12%,100%_15%,97%_18%,100%_21%,97%_24%,100%_27%,97%_30%,100%_33%,97%_36%,100%_39%,97%_42%,100%_45%,97%_48%,100%_51%,97%_54%,100%_57%,97%_60%,100%_63%,97%_66%,100%_69%,97%_72%,100%_75%,97%_78%,100%_81%,97%_84%,100%_87%,97%_90%,100%_94%,96%_100%,4%_100%,0_94%,3%_90%,0_87%,3%_84%,0_81%,3%_78%,0_75%,3%_72%,0_69%,3%_66%,0_63%,3%_60%,0_57%,3%_54%,0_51%,3%_48%,0_45%,3%_42%,0_39%,3%_36%,0_33%,3%_30%,0_27%,3%_24%,0_21%,3%_18%,0_15%,3%_12%,0_9%,3%_6%,0_3%)] before:absolute before:inset-x-0 before:top-[6%] before:h-0.5 before:border-y before:border-dashed before:border-white/[.58] before:content-[''] after:absolute after:h-[28%] after:-rotate-[28deg] after:bg-white/[.18] after:[inset:auto_-45%_12%_24%] after:content-['']"
          >
            <span
              class="relative z-[1] text-[clamp(.55rem,1.2vw,.79rem)] font-black tracking-[.16em]"
              >{{ t('shop.free') }}</span
            >
            <strong
              class="relative z-[1] text-[clamp(1.25rem,4vw,2.2rem)] font-[950] leading-none tracking-[-.08em]"
              >{{ t('shop.itemType') }}</strong
            >
            <span
              class="relative z-[1] mt-[.35rem] text-[clamp(.55rem,1.2vw,.79rem)] font-black tracking-[.16em] opacity-[.72]"
              >{{ t('shop.cooldownPack') }}</span
            >
          </div>
        </div>

        <div class="relative z-10">
          <h2 class="text-base font-black leading-none tracking-tight sm:text-xl">
            {{ t('shop.freeTitle') }}
          </h2>
          <p class="mt-1 text-[9px] font-bold leading-snug text-ink/55 sm:text-[10px]">
            {{
              cooldownRemainingMs === 0
                ? t('shop.gameAvailable')
                : t('shop.cooldownRemaining', { time: cooldownText })
            }}
          </p>
          <Button
            class="mt-2 w-full text-[11px] sm:mt-3 sm:text-sm"
            :label="t('shop.getFree')"
            icon="pi pi-bolt"
            :disabled="!miniGameLoaded || cooldownRemainingMs > 0"
            type="button"
            @click="handlePlay"
          />
        </div>
      </article>
    </div>

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
          <h2 class="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
            {{ t('shop.inventoryTitle') }}
          </h2>
          <p class="mt-1 hidden text-xs text-ink/55 sm:block">{{ t('shop.inventoryText') }}</p>
        </div>
        <strong class="text-3xl font-black leading-none tabular-nums sm:text-4xl">
          {{ ownedPackIds.length }}
        </strong>
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
              class="relative flex aspect-[9/14] w-[min(62%,5.75rem)] -rotate-3 flex-col items-center justify-center overflow-hidden border border-white/[.55] bg-[linear-gradient(145deg,rgb(var(--color-gold)),rgb(var(--color-coral))_55%,#9e2e51)] text-white shadow-[0_12px_22px_rgb(0_0_0/.25)] [clip-path:polygon(4%_0,96%_0,100%_3%,97%_6%,100%_9%,97%_12%,100%_15%,97%_18%,100%_21%,97%_24%,100%_27%,97%_30%,100%_33%,97%_36%,100%_39%,97%_42%,100%_45%,97%_48%,100%_51%,97%_54%,100%_57%,97%_60%,100%_63%,97%_66%,100%_69%,97%_72%,100%_75%,97%_78%,100%_81%,97%_84%,100%_87%,97%_90%,100%_94%,96%_100%,4%_100%,0_94%,3%_90%,0_87%,3%_84%,0_81%,3%_78%,0_75%,3%_72%,0_69%,3%_66%,0_63%,3%_60%,0_57%,3%_54%,0_51%,3%_48%,0_45%,3%_42%,0_39%,3%_36%,0_33%,3%_30%,0_27%,3%_24%,0_21%,3%_18%,0_15%,3%_12%,0_9%,3%_6%,0_3%)] before:absolute before:inset-x-0 before:top-[6%] before:h-0.5 before:border-y before:border-dashed before:border-white/[.58] before:content-[''] after:absolute after:h-[28%] after:-rotate-[28deg] after:bg-white/[.18] after:[inset:auto_-45%_12%_24%] after:content-['']"
            >
              <span
                class="relative z-[1] text-[clamp(.55rem,1.2vw,.79rem)] font-black tracking-[.16em]"
                >VKLEYKI</span
              >
              <strong
                class="relative z-[1] text-[clamp(1.25rem,4vw,2.2rem)] font-[950] leading-none tracking-[-.08em]"
                >2026</strong
              >
              <span
                class="relative z-[1] mt-[.35rem] text-[clamp(.55rem,1.2vw,.79rem)] font-black tracking-[.16em] opacity-[.72]"
                >5 STICKERS</span
              >
            </div>
          </div>
          <p class="mt-2 truncate text-xs font-black">
            {{ t('shop.ownedPackNumber', { number: index + 1 }) }}
          </p>
          <Button
            class="mt-2 w-full !border-paper !bg-paper !text-ink text-xs hover:!border-coral hover:!bg-coral hover:!text-white"
            :label="t('shop.openOwnedPack')"
            icon="pi pi-gift"
            size="small"
            type="button"
            @click="handleOpen"
          />
        </article>
      </div>

      <div
        v-else
        class="flex min-h-52 flex-col items-center justify-center border border-dashed border-ink/20 p-5 text-center"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-ink/5">
          <i class="pi pi-box text-xl text-ink/30" />
        </span>
        <strong class="mt-3 text-sm">{{ t('shop.emptyPacksTitle') }}</strong>
        <p class="mt-1 max-w-sm text-xs text-ink/50">{{ t('shop.emptyPacksText') }}</p>
      </div>
    </section>
  </div>
</template>
