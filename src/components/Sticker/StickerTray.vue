<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StickerDraggable from '@/components/DragDrop/StickerDraggable.vue'
import StickerPeelGame from '@/components/MiniGame/StickerPeelGame.vue'
import type { StickerDropResult, StickerPreparation, StickerTrayItem } from '@/types'

interface Props {
  cards: StickerTrayItem[]
}

interface Emits {
  focus: [playerId: string]
  'drag-start': [playerId: string]
  ready: [instanceId: string, preparation: StickerPreparation]
  drop: [result: StickerDropResult]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const selectedInstanceId: Ref<string | undefined> = ref(undefined)
const isPeelOpen: Ref<boolean> = ref(false)
const selectedItem: ComputedRef<StickerTrayItem | undefined> = computed(
  (): StickerTrayItem | undefined =>
    props.cards.find(({ instance }): boolean => instance.id === selectedInstanceId.value),
)

const prepareSticker = (item: StickerTrayItem): void => {
  selectedInstanceId.value = item.instance.id
  emit('focus', item.instance.playerId)
  isPeelOpen.value = true
}

// Сохраняет результат мини-игры и разрешает перенос конкретного экземпляра.
const completePreparation = (instanceId: string, preparation: StickerPreparation): void =>
  emit('ready', instanceId, preparation)

const closePreparation = (): void => {
  selectedInstanceId.value = undefined
}
</script>

<template>
  <section
    class="sticker-tray-shell flex h-52 max-h-52 w-full shrink-0 flex-col border-t border-ink/15 bg-paper p-3"
    :aria-label="t('stickerTray.title')"
  >
    <div class="sticker-tray__header mb-2 flex items-end justify-between gap-3">
      <div>
        <p class="sticker-tray__title text-xs font-bold uppercase tracking-[0.16em] text-coral">
          {{ t('stickerTray.title') }}
        </p>
        <p class="sticker-tray__hint mt-1 text-xs text-ink/55">{{ t('stickerTray.hint') }}</p>
      </div>
      <span class="sticker-tray__count shrink-0 text-xs font-bold text-ink/55">{{ cards.length }}</span>
    </div>

    <div v-if="cards.length" class="sticker-tray flex min-h-0 flex-1 gap-3 pb-3">
      <StickerDraggable
        v-for="item in cards"
        :key="item.instance.id"
        :card="item.card"
        :instance="item.instance"
        :prepared="Boolean(item.instance.preparation)"
        @prepare="prepareSticker(item)"
        @drag-start="emit('drag-start', $event)"
        @drop="emit('drop', $event)"
      />
    </div>
    <p
      v-else
      class="sticker-tray__empty rounded border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55"
    >
      {{ t('stickerTray.empty') }}
    </p>
  </section>

  <StickerPeelGame
    v-model:visible="isPeelOpen"
    :item="selectedItem"
    @complete="completePreparation"
    @closed="closePreparation"
  />
</template>

<style scoped>
.sticker-tray {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--color-coral) / 0.55) transparent;
  touch-action: pan-x;
}

@media (max-width: 767px) {
  .sticker-tray-shell {
    height: 8.5rem;
    max-height: 8.5rem;
    padding: 0.5rem;
  }

  .sticker-tray__header {
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .sticker-tray__title,
  .sticker-tray__count {
    font-size: 0.55rem;
  }

  .sticker-tray__title {
    letter-spacing: 0.12em;
  }

  .sticker-tray__hint {
    display: none;
  }

  .sticker-tray {
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  .sticker-tray__empty {
    padding: 0.75rem;
    font-size: 0.7rem;
  }
}
</style>
