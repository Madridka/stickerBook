<script setup lang="ts">
import type { CardDefinition } from '@/types'

import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import LoadableImage from '@/components/ui/LoadableImage.vue'

interface Props {
  visible: boolean
  cards: CardDefinition[]
  selectedId: string | null
  ownedCardIds: Set<string>
  eyebrow: string
  title: string
  description: string
  claimLabel: string
  claimingLabel: string
  ownedLabel: string
  notOwnedLabel: string
  chooseLabel: (name: string) => string
  loading?: boolean
  closable?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  closable: true,
  error: '',
})
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:selectedId': [value: string | null]
  claim: []
}>()

const updateVisible = (value: boolean): void => emit('update:visible', value)
const selectCard = (cardId: string): void => emit('update:selectedId', cardId)
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :closable="closable && !loading"
    :close-on-escape="closable && !loading"
    :dismissable-mask="closable && !loading"
    class="w-[calc(100vw-1rem)] max-w-4xl"
    @update:visible="updateVisible"
  >
    <template #header>
      <div>
        <p class="text-xs font-black uppercase tracking-[0.16em] text-coral">{{ eyebrow }}</p>
        <h2 class="mt-1 text-2xl font-black">{{ title }}</h2>
      </div>
    </template>
    <p class="mb-3 text-xs text-ink/60">{{ description }}</p>
    <p v-if="error" class="mb-3 text-sm font-bold text-coral" role="alert">{{ error }}</p>

    <!-- Единый выбор наградной карточки для повторок и ежедневных заданий. -->
    <div
      class="grid auto-cols-[9rem] grid-flow-col justify-start gap-3 overflow-x-auto pb-2 sm:grid-flow-row sm:grid-cols-3 sm:auto-cols-auto"
    >
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="min-w-36 border-4 bg-paper p-2 text-left transition-all"
        :class="
          selectedId === card.id
            ? 'border-coral shadow-[6px_6px_0_rgb(var(--color-coral)/0.3)]'
            : 'border-ink/20 hover:border-ink'
        "
        :aria-label="chooseLabel(card.displayName)"
        :aria-pressed="selectedId === card.id"
        :disabled="loading"
        data-card-choice
        :data-card-id="card.id"
        @click="selectCard(card.id)"
      >
        <LoadableImage
          class="aspect-[2/3] w-full bg-white object-cover"
          :src="card.image"
          :alt="card.displayName"
          fit="cover"
        />
        <strong class="mt-2 block truncate text-sm">{{ card.displayName }}</strong>
        <span
          class="mt-1 inline-block text-[10px] font-black uppercase tracking-wide"
          :class="ownedCardIds.has(card.id) ? 'text-coral' : 'text-emerald-700'"
        >
          {{ ownedCardIds.has(card.id) ? ownedLabel : notOwnedLabel }}
        </span>
      </button>
    </div>
    <template #footer>
      <Button
        :label="loading ? claimingLabel : claimLabel"
        icon="pi pi-check"
        :disabled="!selectedId"
        :loading="loading"
        data-card-choice-claim
        @click="emit('claim')"
      />
    </template>
  </Dialog>
</template>
