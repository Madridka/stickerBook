<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ClickEffect from '@/components/Clicker/ClickEffect.vue'
import logoUrl from '../../../assets/game/wc-26/main/logo.png'

interface ClickEffectItem {
  id: number
  x: number
  y: number
}

interface ClickAreaProps {
  effects: ClickEffectItem[]
}

// Получает список эффектов, которые нужно показать поверх области клика
defineProps<ClickAreaProps>()

const emit = defineEmits<{ click: [event: MouseEvent] }>()
const { t } = useI18n()
</script>

<template>
  <!-- Область клика и слой эффектов поверх логотипа -->
  <div class="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-visible">
    <!-- Кнопка с логотипом, начисляющая coins при нажатии -->
    <button
      class="group relative flex w-44 touch-manipulation select-none items-center justify-center p-4 text-center outline-none transition-transform duration-100 ease-out hover:scale-[1.03] active:translate-y-3 active:scale-[.96] focus-visible:ring-4 focus-visible:ring-coral/40 sm:w-56 sm:p-5"
      type="button"
      :aria-label="t('home.clickPrompt')"
      @click="emit('click', $event)"
    >
      <img
        class="w-full object-contain drop-shadow-[0_18px_12px_rgb(var(--color-ink)/.2)] transition-transform duration-100 group-active:scale-95"
        :src="logoUrl"
        :alt="t('home.logoAlt')"
      />
    </button>
    <!-- Отображение активных эффектов клика -->
    <ClickEffect v-for="effect in effects" :key="effect.id" v-bind="effect" />
  </div>
</template>
