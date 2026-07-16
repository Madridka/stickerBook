<script setup lang="ts">
import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StickerDraggable from '@/components/DragDrop/StickerDraggable.vue'
import StickerPeelGame from '@/components/MiniGame/StickerPeelGame.vue'
import type { StickerDropResult, StickerTrayItem } from '@/types'

interface Props {
  cards: StickerTrayItem[]
}

interface Emits {
  focus: [playerId: string]
  ready: [instanceId: string, quality: number]
  drop: [result: StickerDropResult]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const preparedIds: Ref<Set<string>> = ref(new Set())
const selectedInstanceId: Ref<string | undefined> = ref(undefined)
const isPeelOpen: Ref<boolean> = ref(false)
const selectedItem: ComputedRef<StickerTrayItem | undefined> = computed((): StickerTrayItem | undefined =>
  props.cards.find(({ instance }): boolean => instance.id === selectedInstanceId.value),
)

const prepareSticker = (item: StickerTrayItem): void => {
  selectedInstanceId.value = item.instance.id
  emit('focus', item.instance.playerId)
  isPeelOpen.value = true
}

// Сохраняет результат мини-игры и разрешает перенос конкретного экземпляра.
const completePreparation = (instanceId: string, quality: number): void => {
  preparedIds.value = new Set([...preparedIds.value, instanceId])
  emit('ready', instanceId, quality)
}

const closePreparation = (): void => {
  selectedInstanceId.value = undefined
}
</script>

<template>
  <section
    class="flex max-h-52 w-full shrink-0 flex-col border-t border-ink/15 bg-paper p-3 lg:h-full lg:max-h-none lg:w-80 lg:border-l lg:border-t-0"
    :aria-label="t('stickerTray.title')"
  >
    <div class="mb-2 flex items-end justify-between gap-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-coral">{{ t('stickerTray.title') }}</p>
        <p class="mt-1 text-xs text-ink/55">{{ t('stickerTray.hint') }}</p>
      </div>
      <span class="shrink-0 text-xs font-bold text-ink/55">{{ cards.length }}</span>
    </div>

    <div
      v-if="cards.length"
      class="sticker-tray flex min-h-0 gap-3 overflow-x-auto pb-3 lg:flex-1 lg:flex-col lg:items-center lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0"
    >
      <StickerDraggable
        v-for="item in cards"
        :key="item.instance.id"
        :card="item.card"
        :instance="item.instance"
        :prepared="preparedIds.has(item.instance.id)"
        @prepare="prepareSticker(item)"
        @drop="emit('drop', $event)"
      />
    </div>
    <p v-else class="rounded border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55">
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

@media (min-width: 1024px) {
  .sticker-tray {
    touch-action: pan-y;
  }
}
</style>
