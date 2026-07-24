<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { StickerDropResult, StickerPreparation, StickerTrayItem } from '@/types'

import StickerDraggable from '@/components/DragDrop/StickerDraggable.vue'
import StickerPeelGame from '@/components/MiniGame/StickerPeelGame.vue'
import StickerPreviewDialog from '@/components/Sticker/StickerPreviewDialog.vue'

interface Props {
  cards: StickerTrayItem[]
  highlightedInstanceId?: string
}

interface Emits {
  focus: [playerId: string]
  'clear-focus': []
  'drag-start': [playerId: string]
  ready: [instanceId: string, preparation: StickerPreparation]
  drop: [result: StickerDropResult]
  remove: [instanceId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isCollapsed: Ref<boolean> = ref(false)
const selectedInstanceId: Ref<string | undefined> = ref(undefined)
const isPeelOpen: Ref<boolean> = ref(false)
const isPreparationCompleted: Ref<boolean> = ref(false)
const previewItem: Ref<StickerTrayItem | undefined> = ref(undefined)
const isPreviewOpen: Ref<boolean> = ref(false)
const trayScrollRef: Ref<HTMLElement | undefined> = ref(undefined)
const selectedItem: ComputedRef<StickerTrayItem | undefined> = computed(
  (): StickerTrayItem | undefined =>
    props.cards.find(({ instance }): boolean => instance.id === selectedInstanceId.value),
)

const prepareSticker = (item: StickerTrayItem): void => {
  selectedInstanceId.value = item.instance.id
  isPreparationCompleted.value = false
  emit('focus', item.instance.playerId)
  isPeelOpen.value = true
}

const openPreview = (item: StickerTrayItem): void => {
  previewItem.value = item
  isPreviewOpen.value = true
}

const preparePreviewedSticker = (): void => {
  if (!previewItem.value) return
  prepareSticker(previewItem.value)
}

// Сохраняет результат мини-игры и разрешает перенос конкретного экземпляра.
const completePreparation = (instanceId: string, preparation: StickerPreparation): void => {
  isPreparationCompleted.value = true
  emit('ready', instanceId, preparation)
}

const scrollCardsWithWheel = (event: WheelEvent): void => {
  const tray = event.currentTarget as HTMLElement
  const maxScrollLeft = tray.scrollWidth - tray.clientWidth
  if (maxScrollLeft <= 0) return

  const wheelDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  const deltaScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? tray.clientWidth : 1
  const nextScrollLeft = Math.min(
    maxScrollLeft,
    Math.max(0, tray.scrollLeft + wheelDelta * deltaScale),
  )

  if (nextScrollLeft === tray.scrollLeft) return
  event.preventDefault()
  tray.scrollLeft = nextScrollLeft
}

const closePreparation = (): void => {
  selectedInstanceId.value = undefined
  if (!isPreparationCompleted.value) emit('clear-focus')
  isPreparationCompleted.value = false
}

const toggleCollapsed = (): void => {
  isCollapsed.value = !isCollapsed.value
}

// Показывает поднятую в начало карточку и возвращает прокрутку к ней.
watch(
  (): string | undefined => props.highlightedInstanceId,
  (instanceId: string | undefined): void => {
    if (!instanceId) return
    isCollapsed.value = false
    void nextTick((): void => {
      trayScrollRef.value?.scrollTo({ left: 0, behavior: 'smooth' })
    })
  },
  { immediate: true },
)
</script>

<template>
  <section
    class="relative flex w-full shrink-0 flex-col overflow-visible border-t border-ink/15 bg-paper px-3 transition-[height,max-height,padding] duration-200 ease-out max-md:px-2"
    :class="
      isCollapsed
        ? 'h-11 max-h-11 justify-center py-0'
        : 'h-52 max-h-52 pb-1 pt-3 max-md:h-[8.5rem] max-md:max-h-[8.5rem] max-md:pb-1 max-md:pt-2'
    "
    :aria-label="t('stickerTray.title')"
  >
    <button
      type="button"
      class="absolute left-1/2 top-0 z-20 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-ink/15 bg-paper text-ink/70 shadow-md transition hover:border-coral/50 hover:text-coral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral max-md:h-8 max-md:w-8"
      :aria-expanded="!isCollapsed"
      :aria-label="t(isCollapsed ? 'stickerTray.expand' : 'stickerTray.collapse')"
      :title="t(isCollapsed ? 'stickerTray.expand' : 'stickerTray.collapse')"
      @click="toggleCollapsed"
    >
      <i
        class="pi text-xs"
        :class="isCollapsed ? 'pi-chevron-up' : 'pi-chevron-down'"
        aria-hidden="true"
      />
    </button>

    <div
      class="flex justify-between gap-3 max-md:items-center max-md:gap-2"
      :class="isCollapsed ? 'mb-0 items-center' : 'mb-2 items-end max-md:mb-1'"
    >
      <div>
        <p
          class="text-xs font-bold uppercase tracking-[0.16em] text-coral max-md:text-[0.55rem] max-md:leading-none max-md:tracking-[0.12em]"
        >
          {{ t('stickerTray.title') }}
        </p>
        <p v-if="!isCollapsed" class="mt-1 text-xs text-ink/55 max-md:hidden">
          {{ t('stickerTray.hint') }}
        </p>
      </div>
      <span
        class="shrink-0 text-xs font-bold text-ink/55 max-md:text-[0.55rem] max-md:leading-none"
        >{{ cards.length }}</span
      >
    </div>

    <div
      v-if="!isCollapsed && cards.length"
      ref="trayScrollRef"
      class="flex min-h-0 flex-1 touch-pan-x gap-3 overflow-x-auto overflow-y-hidden px-1 pt-1 [scrollbar-color:rgb(var(--color-coral)/0.55)_transparent] [scrollbar-width:thin] max-md:gap-2"
      @wheel="scrollCardsWithWheel"
    >
      <StickerDraggable
        v-for="item in cards"
        :key="item.instance.id"
        :card="item.card"
        :instance="item.instance"
        :prepared="Boolean(item.instance.preparation)"
        :highlighted="item.instance.id === highlightedInstanceId"
        @prepare="prepareSticker(item)"
        @preview="openPreview(item)"
        @drag-start="emit('drag-start', $event)"
        @drop="emit('drop', $event)"
      />
    </div>
    <p
      v-else-if="!isCollapsed"
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
  <StickerPreviewDialog
    v-model:visible="isPreviewOpen"
    :card="previewItem?.card"
    :instance="previewItem?.instance"
    @prepare="preparePreviewedSticker"
    @remove="emit('remove', $event.id)"
  />
</template>
