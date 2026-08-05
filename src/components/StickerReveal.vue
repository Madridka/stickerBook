<script setup lang="ts">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { playerPositionLabels } from '@/data/playerPositionLabels'
import type { CardDefinition } from '@/types'

import Button from 'primevue/button'
import LoadableImage from '@/components/ui/LoadableImage.vue'

interface Props {
  card: CardDefinition
  index: number
  total: number
  duplicate?: boolean
  advancing?: boolean
}

const props: Props = withDefaults(defineProps<Props>(), { duplicate: false, advancing: false })
const emit = defineEmits<{ next: [] }>()
const { t } = useI18n()
const isRevealed: Ref<boolean> = ref(false)
const imageReady: Ref<boolean> = ref(false)
const cardKindLabel: ComputedRef<string> = computed((): string =>
  props.card.kind === 'player'
    ? playerPositionLabels[props.card.position]
    : props.card.kind.toUpperCase(),
)
const cardTeamLabel: ComputedRef<string> = computed((): string =>
  props.card.teamId
    .replace(/-and(?=[a-z])/g, '-and-')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase(),
)
const cardMetaLabel: ComputedRef<string> = computed((): string =>
  [props.card.cardNumber, props.card.kind === 'player' ? props.card.position : null]
    .filter((value): value is string => value !== null)
    .join(' · '),
)

// Сбрасывает состояние просмотра при переходе к следующей карточке
watch(
  () => props.card.id,
  (): void => {
    isRevealed.value = false
    imageReady.value = false
  },
)

// Разрешает переход только после явного просмотра текущей карточки
const reveal = (): void => {
  if (isRevealed.value) return
  isRevealed.value = true
}

const showNext = (): void => {
  if (!props.advancing && imageReady.value) emit('next')
}

// Повторяет действия нижней кнопки при клике непосредственно по карточке
const handleCardClick = (): void => {
  if (isRevealed.value && imageReady.value) {
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
    <div
      class="mt-5 h-[min(65dvh,32rem)] w-full max-w-sm overflow-hidden border-4 border-ink bg-paper p-3 text-left shadow-[10px_10px_0_rgb(var(--color-ink)/0.14)] transition-[transform,box-shadow] duration-[220ms] ease-[ease]"
      :class="
        isRevealed
          ? ''
          : 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:-rotate-1 hover:shadow-[12px_12px_0_rgb(var(--color-ink)/0.14)]'
      "
      role="button"
      tabindex="0"
      :aria-label="isRevealed ? card.displayName : t('packOpening.reveal')"
      @click="handleCardClick"
      @keydown.enter.self="handleCardClick"
      @keydown.space.self.prevent="handleCardClick"
    >
      <div v-if="isRevealed" class="flex h-full min-h-0 flex-col overflow-hidden bg-white p-2">
        <div class="min-h-0 flex-1">
          <div class="relative h-full">
            <LoadableImage
              class="h-full w-full"
              :src="card.image"
              :alt="card.displayName"
              fit="contain"
              eager
              detailed-error
              retryable
              @load="imageReady = true"
              @error="imageReady = false"
            />
            <span
              v-if="duplicate"
              class="absolute right-2 top-2 rounded bg-coral px-2 py-1 text-xs font-black uppercase tracking-wide text-white shadow"
            >
              {{ t('packOpening.duplicateLabel') }}
            </span>
          </div>
        </div>
        <div class="shrink-0 border-t-2 border-ink pt-2">
          <p class="text-xs font-bold uppercase tracking-[0.14em] text-coral">
            {{ cardKindLabel }}
          </p>
          <p class="mt-1 text-xl font-black leading-tight">
            {{ card.displayName }}
            <span class="text-sm text-ink/60">· {{ cardMetaLabel }}</span>
          </p>
          <p class="text-xs font-black uppercase tracking-[0.1em] text-ink/60" data-card-team>
            {{ cardTeamLabel }}
          </p>
          <p v-if="duplicate" class="mt-1 text-xs font-bold text-coral">
            {{ t('packOpening.duplicateStorageHint') }}
          </p>
        </div>
      </div>
      <div v-else class="flex h-full flex-col items-center justify-center bg-ink text-paper">
        <span class="text-6xl font-black">?</span>
        <span class="mt-4 text-sm font-bold uppercase tracking-[0.18em]">{{
          t('packOpening.reveal')
        }}</span>
      </div>
    </div>
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
      :disabled="advancing || !imageReady"
      :loading="advancing"
      type="button"
      @click="showNext"
    />
  </div>
</template>
