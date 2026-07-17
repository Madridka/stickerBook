<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits<{ complete: [] }>()
const { t } = useI18n()
const animationStep: Ref<number> = ref(0)
let animationTimer: number | undefined

// Последовательно переводит Pack из состояния появления в состояние разрыва
const startAnimation = (): void => {
  animationTimer = window.setInterval((): void => {
    animationStep.value += 1
    if (animationStep.value >= 3) {
      window.clearInterval(animationTimer)
      animationTimer = undefined
      window.setTimeout((): void => emit('complete'), 450)
    }
  }, 850)
}

onMounted(startAnimation)
onBeforeUnmount((): void => {
  if (animationTimer !== undefined) window.clearInterval(animationTimer)
})
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" aria-live="polite">
    <div
      class="relative flex h-64 w-44 items-center justify-center border-4 border-ink bg-coral shadow-[12px_12px_0_rgb(var(--color-ink)/0.16)] transition-all duration-700 sm:h-80 sm:w-56"
      :class="{
        'scale-90 opacity-0': animationStep === 0,
        'scale-100 opacity-100': animationStep === 1,
        '[clip-path:polygon(0_0,100%_0,96%_45%,100%_100%,0_100%,4%_53%)] -rotate-[4deg] scale-105':
          animationStep === 2,
        'scale-110 opacity-0': animationStep === 3,
      }"
    >
      <div class="absolute inset-x-0 top-1/2 border-t-4 border-dashed border-paper/80" />
      <span class="relative text-4xl font-black uppercase tracking-[0.2em] text-paper">
        {{ t('packOpening.packLabel') }}
      </span>
    </div>
    <p class="mt-8 text-lg font-bold">{{ t(`packOpening.animation.step${animationStep + 1}`) }}</p>
  </div>
</template>
