<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CardDefinition, StickerInstance } from '@/types'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

interface Props {
  visible: boolean
  card?: CardDefinition
  instance?: StickerInstance
}

interface Emits {
  'update:visible': [value: boolean]
  prepare: [instance: StickerInstance]
  remove: [instance: StickerInstance]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isFlipped: Ref<boolean> = ref(false)

// Каждый новый просмотр начинает с лицевой стороны карточки.
watch(
  (): boolean => props.visible,
  (visible: boolean): void => {
    if (visible) isFlipped.value = false
  },
)

const toggleFlip = (): void => {
  isFlipped.value = !isFlipped.value
}
const close = (): void => {
  emit('update:visible', false)
}
const remove = (): void => {
  if (!props.instance) return
  emit('remove', props.instance)
  close()
}

const prepare = (): void => {
  if (!props.instance) return
  emit('prepare', props.instance)
  close()
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="t('stickerPreview.title')"
    class="w-[min(94vw,42rem)]"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="card && instance" class="flex flex-col items-center gap-4">
      <button
        class="[perspective:1000px]"
        type="button"
        :aria-label="t('stickerPreview.flip')"
        @click="toggleFlip"
      >
        <div
          class="relative aspect-[2/3] w-52 transition-transform duration-500 [transform-style:preserve-3d] md:w-72 2xl:w-80"
          :class="{ '[transform:rotateY(180deg)]': isFlipped }"
        >
          <img
            class="absolute inset-0 h-full w-full rounded-lg object-cover shadow-xl [backface-visibility:hidden]"
            :src="card.image"
            :alt="card.displayName"
          />
          <div
            class="absolute inset-0 flex flex-col justify-between rounded-lg bg-ink p-5 text-paper shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)] md:p-7"
          >
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-gold md:text-sm">
              {{ card.id }}
            </p>
            <div>
              <p class="text-xs uppercase tracking-wide text-paper/55 md:text-sm">
                {{ t('stickerPreview.player') }}
              </p>
              <strong class="mt-1 block text-xl leading-tight md:text-3xl">{{
                card.displayName
              }}</strong>
              <p class="mt-4 text-xs uppercase tracking-wide text-paper/55 md:mt-6 md:text-sm">
                {{ t('stickerPreview.quality') }}
              </p>
              <strong class="mt-1 block text-lg md:text-2xl">{{ instance.quality }}%</strong>
              <p class="mt-4 text-xs uppercase tracking-wide text-paper/55 md:mt-6 md:text-sm">
                {{ t('stickerPreview.status') }}
              </p>
              <strong class="mt-1 block text-sm md:text-lg">{{
                t(`album.location.${instance.location}`)
              }}</strong>
            </div>
            <p class="text-center text-xs text-paper/55 md:text-sm">
              {{ t('stickerPreview.flip') }}
            </p>
          </div>
        </div>
      </button>
      <Button
        v-if="!instance.preparation && instance.location !== 'album'"
        :label="t('stickerTray.prepareAction')"
        icon="pi pi-sparkles"
        type="button"
        @click="prepare"
      />
      <Button
        :label="t('stickerPreview.delete')"
        icon="pi pi-trash"
        severity="danger"
        outlined
        type="button"
        @click="remove"
      />
    </div>
  </Dialog>
</template>
