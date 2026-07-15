<script setup lang="ts">
interface ClickEffectProps {
  id: number
  x: number
  y: number
}

// Получает координаты и идентификатор конкретного эффекта
defineProps<ClickEffectProps>()
</script>

<template>
  <!-- Одноразовый визуальный эффект начисления монеты -->
  <span
    :key="id"
    class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 select-none text-2xl font-black text-coral"
    :style="{ left: `${x}px`, top: `${y}px` }"
    aria-hidden="true"
    >+1</span
  >
</template>

<style scoped>
span {
  animation: click-effect 700ms cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
}
@keyframes click-effect {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.8);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -145%) scale(1.15);
  }
}
</style>
