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
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center justify-center gap-2 sm:gap-4">
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-paper text-ink shadow-sm transition hover:border-gold hover:bg-gold/10 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:h-11 sm:w-11"
            type="button"
            data-flip-direction="left"
            :aria-label="t('stickerPreview.flipLeft')"
            @click="toggleFlip"
          >
            <i class="pi pi-chevron-left" aria-hidden="true" />
          </button>
          <button
            class="[perspective:1000px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4"
            type="button"
            data-flip-card
            :aria-label="t('stickerPreview.flip')"
            @click="toggleFlip"
          >
            <div
              class="relative aspect-[2/3] w-52 transition-transform duration-500 [transform-style:preserve-3d] md:w-72 2xl:w-80"
              data-sticker-flip
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
                  <p
                    class="mt-2 flex items-start gap-1.5 text-left text-[10px] leading-relaxed text-paper/70 md:text-xs"
                  >
                    <i class="pi pi-info-circle mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{{ t('stickerPreview.qualityDescription') }}</span>
                  </p>
                  <p class="mt-3 text-xs uppercase tracking-wide text-paper/55 md:mt-5 md:text-sm">
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
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-paper text-ink shadow-sm transition hover:border-gold hover:bg-gold/10 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:h-11 sm:w-11"
            type="button"
            data-flip-direction="right"
            :aria-label="t('stickerPreview.flipRight')"
            @click="toggleFlip"
          >
            <i class="pi pi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <p class="text-center text-xs text-ink/55">
          <i class="pi pi-sync mr-1" aria-hidden="true" />
          {{ t('stickerPreview.flipHint') }}
        </p>
      </div>
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
