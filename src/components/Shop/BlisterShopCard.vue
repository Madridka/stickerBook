<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatCountdown } from '@/utils/formatCountdown'
import type { BlisterDefinition } from '@/types'

import Button from 'primevue/button'

interface Props {
  blister: BlisterDefinition
  canBuy: boolean
  purchasing: boolean
  cooldownRemainingMs: number
  loaded: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ purchase: [] }>()
const { t } = useI18n()
const price: ComputedRef<string> = computed((): string =>
  props.blister.cost.toLocaleString('ru-RU'),
)
const cooldown: ComputedRef<string> = computed((): string =>
  formatCountdown(props.cooldownRemainingMs),
)
const toneClass: ComputedRef<string> = computed(
  (): string =>
    ({
      mixed: 'from-[#101d35] via-[#176947] to-[#d75a3e]',
      standard: 'from-[#5e254f] via-[#d75a3e] to-[#efb943]',
      ucl: 'from-[#11153c] via-[#382b75] to-[#bd4e82]',
      kdv: 'from-[#152a4a] via-[#176947] to-[#d75a3e]',
      'spain-logos': 'from-[#8f1d2c] via-[#d95c32] to-[#efc24c]',
    })[props.blister.id] ?? 'from-[#101d35] via-[#176947] to-[#d75a3e]',
)
</script>

<template>
  <article
    class="relative isolate flex min-h-[13rem] w-full max-w-[14rem] flex-col overflow-hidden bg-gradient-to-br p-3 text-paper shadow-[4px_4px_0_rgb(var(--color-coral)/0.35)] sm:min-h-[15rem] sm:p-4"
    :class="toneClass"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
        {{ t('shop.paidKicker') }}
      </p>
      <span
        class="border border-white/25 bg-black/10 px-1.5 py-0.5 text-[8px] font-black uppercase"
      >
        {{ t('shop.cardsCount', { count: blister.cardCount }) }}
      </span>
    </div>
    <div class="flex flex-1 items-center py-4">
      <strong
        class="break-words text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl"
      >
        {{ t(blister.shortNameKey) }}
      </strong>
    </div>
    <div>
      <h2 class="text-sm font-black leading-tight sm:text-lg">{{ t(blister.titleKey) }}</h2>
      <p
        class="mt-1 line-clamp-2 text-[9px] font-semibold leading-snug text-white/70 sm:text-[10px]"
      >
        {{
          cooldownRemainingMs > 0
            ? t('shop.blisterCooldown', { time: cooldown })
            : t(blister.descriptionKey)
        }}
      </p>
      <Button
        class="mt-2 w-full !border-paper !bg-paper !text-ink"
        size="small"
        :label="t('shop.priceOnly', { price })"
        :disabled="!loaded || !canBuy || purchasing || cooldownRemainingMs > 0"
        :loading="purchasing"
        type="button"
        @click="emit('purchase')"
      />
    </div>
  </article>
</template>
