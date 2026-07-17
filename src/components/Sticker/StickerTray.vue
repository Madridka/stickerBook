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
    class="flex h-52 max-h-52 w-full shrink-0 flex-col border-t border-ink/15 bg-paper p-3 max-md:h-[8.5rem] max-md:max-h-[8.5rem] max-md:p-2"
    :aria-label="t('stickerTray.title')"
  >
    <div class="mb-2 flex items-end justify-between gap-3 max-md:mb-1 max-md:items-center max-md:gap-2">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-coral max-md:text-[0.55rem] max-md:tracking-[0.12em]">
          {{ t('stickerTray.title') }}
        </p>
        <p class="mt-1 text-xs text-ink/55 max-md:hidden">{{ t('stickerTray.hint') }}</p>
      </div>
      <span class="shrink-0 text-xs font-bold text-ink/55 max-md:text-[0.55rem]">{{ cards.length }}</span>
    </div>

    <div
      v-if="cards.length"
      class="flex min-h-0 flex-1 touch-pan-x gap-3 pb-3 [scrollbar-color:rgb(var(--color-coral)/0.55)_transparent] [scrollbar-width:thin] max-md:gap-2 max-md:pb-1"
    >
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
      class="rounded border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55 max-md:p-3 max-md:text-[0.7rem]"
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
