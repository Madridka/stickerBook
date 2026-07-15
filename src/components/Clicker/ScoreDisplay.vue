<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface ScoreDisplayProps {
  score: string
}

// Получает отформатированное значение баланса от родительского экрана
defineProps<ScoreDisplayProps>()

const { t } = useI18n()
</script>

<template>
  <!-- Компактный блок текущего количества coins -->
  <section class="text-center" :aria-label="t('home.score')">
    <p class="text-xs font-bold uppercase tracking-[0.22em] text-ink/50">{{ t('home.score') }}</p>
    <p class="mt-2 text-5xl font-black tracking-tight text-ink tabular-nums sm:text-6xl">
      {{ score }}
    </p>
  </section>
</template>
