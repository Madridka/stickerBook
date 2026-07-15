<script setup lang="ts">
import { ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ClickArea from '@/components/Clicker/ClickArea.vue'
import ScoreDisplay from '@/components/Clicker/ScoreDisplay.vue'
import { usePlayerStore } from '@/stores/player'

interface ClickEffectItem {
  id: number
  x: number
  y: number
}

const { t } = useI18n()
const player = usePlayerStore()
const effects: Ref<ClickEffectItem[]> = ref([])
let nextEffectId: number = 0

// Начисляет очко и размещает короткий визуальный эффект в месте клика
const handleClick = (event: MouseEvent): void => {
  const target: HTMLElement = event.currentTarget as HTMLElement
  const area: DOMRect =
    target.parentElement?.getBoundingClientRect() ?? target.getBoundingClientRect()
  const effect: ClickEffectItem = {
    id: nextEffectId++,
    x: event.clientX - area.left,
    y: event.clientY - area.top,
  }

  player.addCoin()
  effects.value = [...effects.value, effect]
  window.setTimeout((): void => {
    effects.value = effects.value.filter(({ id }: ClickEffectItem): boolean => id !== effect.id)
  }, 700)
}
</script>

<template>
  <section
    class="mx-auto flex h-full min-h-0 max-w-3xl flex-1 flex-col items-center justify-center py-0"
  >
    <div class="mb-2 text-center sm:mb-3">
      <p class="text-xs font-bold uppercase tracking-[0.22em] text-coral sm:text-sm">
        {{ t('home.eyebrow') }}
      </p>
      <h1 class="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
        {{ t('home.clickTitle') }}
      </h1>
      <p class="mt-1 text-sm text-ink/60 sm:text-base">{{ t('home.clickDescription') }}</p>
    </div>
    <ScoreDisplay :score="player.formattedCoins" />
    <ClickArea :effects="effects" @click="handleClick" />
    <p class="-mt-1 text-xs font-semibold text-ink/50 sm:text-sm">{{ t('home.clickPrompt') }}</p>
  </section>
</template>
