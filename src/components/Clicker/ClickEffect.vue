<script setup lang="ts">
interface ClickEffectProps {
  id: number
  x: number
  y: number
  reward: string
}

// Получает координаты и идентификатор конкретного эффекта
defineProps<ClickEffectProps>()
</script>

<template>
  <!-- Одноразовый визуальный эффект начисления монеты -->
  <span
    :key="id"
    class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 animate-click-effect select-none text-2xl font-black text-coral"
    :style="{ left: `${x}px`, top: `${y}px` }"
    aria-hidden="true"
    >+{{ reward }}</span
  >
</template>
