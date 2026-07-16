<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import type { PlayerCard } from '@/types'

interface Props {
  card: PlayerCard
  index: number
  total: number
}

const props: Props = defineProps<Props>()
const emit = defineEmits<{ next: [] }>()
const { t } = useI18n()
const isRevealed: Ref<boolean> = ref(false)

// Сбрасывает состояние просмотра при переходе к следующей карточке
watch(() => props.card.id, (): void => {
  isRevealed.value = false
})

// Разрешает переход только после явного просмотра текущей карточки
const reveal = (): void => {
  if (isRevealed.value) return
  isRevealed.value = true
}

const showNext = (): void => emit('next')

// Повторяет действия нижней кнопки при клике непосредственно по карточке
const handleCardClick = (): void => {
  if (isRevealed.value) {
    showNext()
    return
  }

  reveal()
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col items-center text-center">
    <p class="text-sm font-bold uppercase tracking-[0.18em] text-coral">
      {{ t('packOpening.cardNumber', { current: index + 1, total }) }}
    </p>
    <button
      class="sticker-card mt-5 h-[min(65dvh,32rem)] w-full max-w-sm overflow-hidden border-4 border-ink bg-paper p-3 text-left shadow-[10px_10px_0_rgb(var(--color-ink)/0.14)]"
      :class="{ 'sticker-card--revealed': isRevealed }"
      type="button"
      :aria-label="isRevealed ? card.fullName : t('packOpening.reveal')"
      @click="handleCardClick"
    >
      <div v-if="isRevealed" class="flex h-full min-h-0 flex-col overflow-hidden bg-white p-2">
        <div class="min-h-0 flex-1">
          <img class="h-full w-full object-contain" :src="card.image" :alt="card.fullName" />
        </div>
        <div class="shrink-0 border-t-2 border-ink pt-2">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-coral">{{ card.type }}</p>
          <p class="mt-1 text-xl font-black leading-tight">{{ card.fullName }}</p>
          <p class="text-sm font-semibold text-ink/60">{{ card.team }}</p>
        </div>
      </div>
      <div v-else class="flex h-full flex-col items-center justify-center bg-ink text-paper">
        <span class="text-6xl font-black">?</span>
        <span class="mt-4 text-sm font-bold uppercase tracking-[0.18em]">{{ t('packOpening.reveal') }}</span>
      </div>
    </button>
    <Button
      v-if="!isRevealed"
      class="mt-6"
      :label="t('packOpening.reveal')"
      icon="pi pi-eye"
      type="button"
      @click="reveal"
    />
    <Button
      v-else
      class="mt-6"
      :label="t('packOpening.next')"
      icon="pi pi-arrow-right"
      type="button"
      @click="showNext"
    />
  </div>
</template>

<style scoped>
.sticker-card {
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.sticker-card:hover {
  transform: translate(-2px, -2px) rotate(-1deg);
  box-shadow: 12px 12px 0 rgb(var(--color-ink) / 0.14);
}

.sticker-card--revealed:hover {
  transform: none;
}
</style>
