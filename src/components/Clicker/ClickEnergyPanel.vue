<script setup lang="ts">
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'
import ProgressBar from 'primevue/progressbar'

interface ClickEnergyPanelProps {
  current: number
  limit: number
  percent: number
  millisecondsUntilNext: number
  collectionProgress: number
  reward: string
}

const props = defineProps<ClickEnergyPanelProps>()
const { t } = useI18n()

const isFull: ComputedRef<boolean> = computed((): boolean => props.current >= props.limit)
const recoveryTime: ComputedRef<string> = computed((): string => {
  const totalSeconds: number = Math.max(0, Math.ceil(props.millisecondsUntilNext / 1000))
  const minutes: number = Math.floor(totalSeconds / 60)
  const seconds: number = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})
</script>

<template>
  <!-- Компактно показывает независимый запас кликов и бонус прогресса коллекции. -->
  <section
    class="mt-2 w-full max-w-md rounded-2xl border border-ink/10 bg-white/45 px-3 py-2.5 shadow-sm sm:px-4"
    :aria-label="t('home.energyTitle')"
  >
    <div class="flex items-center justify-between gap-3 text-xs font-bold sm:text-sm">
      <span class="flex items-center gap-1.5 text-ink/70">
        <i class="pi pi-bolt text-coral" aria-hidden="true" />
        {{ t('home.energyTitle') }}
      </span>
      <span class="tabular-nums text-ink">
        {{ t('home.energyValue', { current, limit }) }}
      </span>
    </div>

    <ProgressBar class="click-energy-progress mt-1.5 h-2" :value="percent" :show-value="false" />

    <div class="mt-1.5 flex items-center justify-between gap-3 text-[11px] sm:text-xs">
      <span class="text-ink/55">
        {{ isFull ? t('home.energyFull') : t('home.energyRecovery', { time: recoveryTime }) }}
      </span>
      <span class="font-bold text-coral">
        {{
          t('home.clickBonus', {
            progress: collectionProgress,
            reward,
          })
        }}
      </span>
    </div>
  </section>
</template>

<style scoped>
:deep(.click-energy-progress .p-progressbar-value) {
  background: rgb(var(--color-coral));
  transition: width 300ms ease;
}
</style>
