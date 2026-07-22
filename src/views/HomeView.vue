<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CLICKER_CONFIG, HOME_VIEW_CONFIG } from '@/data/mainConst'
import { useCollectionStore } from '@/stores/collection'
import { usePlayerStore } from '@/stores/player'

import ClickArea from '@/components/Clicker/ClickArea.vue'
import ClickEnergyPanel from '@/components/Clicker/ClickEnergyPanel.vue'
import ScoreDisplay from '@/components/Clicker/ScoreDisplay.vue'

interface ClickEffectItem {
  id: number
  x: number
  y: number
  reward: string
}

const { t } = useI18n()
const player = usePlayerStore()
const collection = useCollectionStore()
// Хранит активные эффекты до завершения их анимации
const effects: Ref<ClickEffectItem[]> = ref([])
let nextEffectId: number = 0
let energyTimer: number | undefined

// Переводит процент заполнения журнала в линейный бонус к награде за клик.
const clickReward: ComputedRef<number> = computed((): number => {
  const rawReward: number = CLICKER_CONFIG.baseReward * (1 + collection.albumProgress / 100)
  const multiplier: number = 10 ** CLICKER_CONFIG.rewardPrecision
  return Math.round((rawReward + Number.EPSILON) * multiplier) / multiplier
})
const formattedClickReward: ComputedRef<string> = computed((): string =>
  clickReward.value.toLocaleString('ru-RU', {
    maximumFractionDigits: CLICKER_CONFIG.rewardPrecision,
  }),
)
const isClickDisabled: ComputedRef<boolean> = computed(
  (): boolean => !player.isLoaded || !collection.isLoaded || !player.canClick,
)
const clickLabel: ComputedRef<string> = computed((): string =>
  player.canClick
    ? t('home.clickPrompt', { reward: formattedClickReward.value })
    : t('home.noEnergy'),
)

// Начисляет награду только при доступной энергии и размещает эффект в месте клика.
const handleClick = (event: MouseEvent): void => {
  if (!player.addCoin(clickReward.value)) return

  const target: HTMLElement = event.currentTarget as HTMLElement
  const area: DOMRect =
    target.parentElement?.getBoundingClientRect() ?? target.getBoundingClientRect()
  const effect: ClickEffectItem = {
    id: nextEffectId++,
    x: event.clientX - area.left,
    y: event.clientY - area.top,
    reward: formattedClickReward.value,
  }

  effects.value = [...effects.value, effect]
  window.setTimeout((): void => {
    effects.value = effects.value.filter(({ id }: ClickEffectItem): boolean => id !== effect.id)
  }, HOME_VIEW_CONFIG.clickEffectDurationMs)
}

onMounted((): void => {
  player.refreshEnergy()
  energyTimer = window.setInterval(
    (): void => player.refreshEnergy(),
    HOME_VIEW_CONFIG.energyRefreshIntervalMs,
  )
})

onBeforeUnmount((): void => {
  if (energyTimer !== undefined) window.clearInterval(energyTimer)
})
</script>

<template>
  <!-- Главный экран clicker-а -->
  <section
    class="mx-auto flex h-full min-h-0 max-w-3xl flex-1 flex-col items-center justify-center py-0"
  >
    <!-- Заголовок и инструкция для игрока -->
    <div class="mb-1 text-center sm:mb-2">
      <p class="hidden text-xs font-bold uppercase tracking-[0.18em] text-coral sm:block">
        {{ t('home.eyebrow') }}
      </p>
      <h1 class="text-2xl font-black tracking-tight sm:mt-0.5 sm:text-4xl">
        {{ t('home.clickTitle') }}
      </h1>
      <p class="mt-0.5 hidden text-xs text-ink/55 md:block">{{ t('home.clickDescription') }}</p>
    </div>
    <!-- Текущий баланс игрока -->
    <ScoreDisplay :score="player.formattedCoins" />

    <ClickEnergyPanel
      :current="player.availableEnergy"
      :limit="player.energyLimit"
      :percent="player.energyPercent"
      :milliseconds-until-next="player.millisecondsUntilNextEnergy"
      :collection-progress="collection.albumProgress"
      :reward="formattedClickReward"
    />

    <!-- Центральная зона получения coins -->
    <ClickArea
      :effects="effects"
      :disabled="isClickDisabled"
      :label="clickLabel"
      @click="handleClick"
    />

    <!-- Подсказка действия -->
    <p class="-mt-1 mb-4 text-xs font-semibold text-ink/50 sm:text-sm">{{ clickLabel }}</p>
  </section>
</template>
