<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'

type ShopSection = 'store' | 'packs'

interface Props {
  price: number
  canBuy: boolean
  purchasing?: boolean
  dailyRemaining: number
  dailyLimit: number
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
        class="store-offer store-offer--paid relative flex aspect-[9/16] w-full max-w-[14rem] flex-col justify-self-end overflow-hidden bg-ink p-3 text-paper shadow-[6px_6px_0_rgb(var(--color-coral)/0.42)] sm:p-4"
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

        <div class="relative z-10 flex min-h-0 flex-1 items-center justify-center py-2">
          <div class="pack-foil pack-foil--paid">
            <span class="pack-foil__eyebrow">VKLEYKI</span>
            <strong>2026</strong>
            <span class="pack-foil__caption">WORLD EDITION</span>
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
            class="offer-button--light mt-2 w-full text-[11px] sm:mt-3 sm:text-sm"
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
        class="store-offer store-offer--free relative flex aspect-[9/16] w-full max-w-[14rem] flex-col justify-self-start overflow-hidden bg-mint p-3 text-ink shadow-[6px_6px_0_rgb(var(--color-gold)/0.55)] sm:p-4"
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
          <div class="pack-foil pack-foil--free">
            <span class="pack-foil__eyebrow">PLAY & WIN</span>
            <strong>FREE</strong>
            <span class="pack-foil__caption">DAILY PACK</span>
          </div>
        </div>

        <div class="relative z-10">
          <h2 class="text-base font-black leading-none tracking-tight sm:text-xl">
            {{ t('shop.freeTitle') }}
          </h2>
          <p class="mt-1 text-[9px] font-bold leading-snug text-ink/55 sm:text-[10px]">
            {{
              dailyRemaining > 0
                ? t('shop.dailyGames', { remaining: dailyRemaining, limit: dailyLimit })
                : t('shop.dailyLimitReached')
            }}
          </p>
          <Button
            class="mt-2 w-full text-[11px] sm:mt-3 sm:text-sm"
            :label="t('shop.getFree')"
            icon="pi pi-bolt"
            :disabled="!miniGameLoaded || dailyRemaining <= 0"
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
            <div class="pack-foil pack-foil--owned">
              <span class="pack-foil__eyebrow">VKLEYKI</span>
              <strong>2026</strong>
              <span class="pack-foil__caption">5 STICKERS</span>
            </div>
          </div>
          <p class="mt-2 truncate text-xs font-black">
            {{ t('shop.ownedPackNumber', { number: index + 1 }) }}
          </p>
          <Button
            class="offer-button--light mt-2 w-full text-xs"
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

<style scoped>
.store-offer {
  isolation: isolate;
}

.store-offer::before,
.store-offer::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.store-offer--paid::before {
  inset: 18% -45% auto 28%;
  height: 42%;
  background: rgb(var(--color-coral) / 0.92);
  transform: rotate(-18deg);
}

.store-offer--paid::after {
  inset: 42% -28% auto -38%;
  height: 12%;
  border-block: 1px solid rgb(var(--color-paper) / 0.22);
  transform: rotate(-18deg);
}

.store-offer--free::before {
  inset: -10% -60% auto 10%;
  height: 58%;
  background: rgb(var(--color-gold) / 0.78);
  transform: rotate(22deg);
}

.store-offer--free::after {
  right: -12%;
  top: 42%;
  width: 70%;
  aspect-ratio: 1;
  border: 1px solid rgb(var(--color-ink) / 0.14);
  border-radius: 9999px;
  box-shadow:
    0 0 0 1rem rgb(var(--color-paper) / 0.12),
    0 0 0 2rem rgb(var(--color-paper) / 0.08);
}

.pack-foil {
  position: relative;
  display: flex;
  width: min(78%, 8.25rem);
  aspect-ratio: 9 / 14;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.55);
  clip-path: polygon(4% 0, 96% 0, 100% 3%, 97% 6%, 100% 9%, 97% 12%, 100% 15%, 97% 18%, 100% 21%, 97% 24%, 100% 27%, 97% 30%, 100% 33%, 97% 36%, 100% 39%, 97% 42%, 100% 45%, 97% 48%, 100% 51%, 97% 54%, 100% 57%, 97% 60%, 100% 63%, 97% 66%, 100% 69%, 97% 72%, 100% 75%, 97% 78%, 100% 81%, 97% 84%, 100% 87%, 97% 90%, 100% 94%, 96% 100%, 4% 100%, 0 94%, 3% 90%, 0 87%, 3% 84%, 0 81%, 3% 78%, 0 75%, 3% 72%, 0 69%, 3% 66%, 0 63%, 3% 60%, 0 57%, 3% 54%, 0 51%, 3% 48%, 0 45%, 3% 42%, 0 39%, 3% 36%, 0 33%, 3% 30%, 0 27%, 3% 24%, 0 21%, 3% 18%, 0 15%, 3% 12%, 0 9%, 3% 6%, 0 3%);
  box-shadow: 0 12px 22px rgb(0 0 0 / 0.25);
  transform: rotate(-3deg);
}

.pack-foil::before,
.pack-foil::after {
  position: absolute;
  content: '';
}

.pack-foil::before {
  inset: 6% 0 auto;
  height: 2px;
  border-block: 1px dashed rgb(255 255 255 / 0.58);
}

.pack-foil::after {
  inset: auto -45% 12% 24%;
  height: 28%;
  background: rgb(255 255 255 / 0.18);
  transform: rotate(-28deg);
}

.pack-foil--paid,
.pack-foil--owned {
  background: linear-gradient(145deg, rgb(var(--color-gold)), rgb(var(--color-coral)) 55%, #9e2e51);
  color: white;
}

.pack-foil--free {
  background: linear-gradient(145deg, rgb(var(--color-ink)), #284f58 60%, rgb(var(--color-coral)));
  color: white;
  transform: rotate(3deg);
}

.pack-foil--owned {
  width: min(62%, 5.75rem);
}

.pack-foil__eyebrow,
.pack-foil__caption {
  position: relative;
  z-index: 1;
  font-size: clamp(0.38rem, 1.2vw, 0.58rem);
  font-weight: 900;
  letter-spacing: 0.16em;
}

.pack-foil strong {
  position: relative;
  z-index: 1;
  font-size: clamp(1.25rem, 4vw, 2.2rem);
  font-weight: 950;
  line-height: 1;
  letter-spacing: -0.08em;
}

.pack-foil__caption {
  margin-top: 0.35rem;
  opacity: 0.72;
}

:deep(.offer-button--light.p-button:not(.p-button-text):not(.p-button-outlined)) {
  border-color: rgb(var(--color-paper));
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
}

:deep(.offer-button--light.p-button:not(.p-button-text):not(.p-button-outlined):hover) {
  border-color: rgb(var(--color-coral));
  background: rgb(var(--color-coral));
  color: white;
}
</style>
