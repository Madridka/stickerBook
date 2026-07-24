<script setup lang="ts">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { HistoricalPlayerInfo } from '@/features/journals/types'
import type { CardDefinition, StickerInstance } from '@/types'

import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

interface Props {
  visible: boolean
  card?: CardDefinition
  instance?: StickerInstance
  historicalPlayer?: HistoricalPlayerInfo
  readOnly?: boolean
}

interface Emits {
  'update:visible': [value: boolean]
  prepare: [instance: StickerInstance]
  remove: [instance: StickerInstance]
  flipped: [value: boolean]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
const isFlipped: Ref<boolean> = ref(false)
const hasContent: ComputedRef<boolean> = computed(
  (): boolean => Boolean(props.historicalPlayer || (props.card && props.instance)),
)
const displayName: ComputedRef<string> = computed(
  (): string => props.historicalPlayer?.shortName ?? props.card?.displayName ?? '',
)
const image: ComputedRef<string> = computed(
  (): string => props.historicalPlayer?.image ?? props.card?.image ?? '',
)

// Каждый новый просмотр начинает с лицевой стороны карточки.
watch(
  (): boolean => props.visible,
  (visible: boolean): void => {
    if (visible) isFlipped.value = false
  },
)

const toggleFlip = (): void => {
  isFlipped.value = !isFlipped.value
  emit('flipped', isFlipped.value)
}
const setFlipped = (value: boolean): void => {
  isFlipped.value = value
  emit('flipped', value)
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
    :header="t(historicalPlayer ? 'stickerPreview.historyTitle' : 'stickerPreview.title')"
    :class="historicalPlayer ? 'w-[min(96vw,52rem)]' : 'w-[min(94vw,42rem)]'"
    @update:visible="emit('update:visible', $event)"
  >
    <div v-if="hasContent" class="flex flex-col items-center gap-4">
      <div
        v-if="historicalPlayer"
        class="inline-flex rounded-full border border-ink/15 bg-ink/5 p-1"
        role="group"
        :aria-label="t('stickerPreview.sideSelector')"
      >
        <button
          class="rounded-full px-3 py-1.5 text-xs font-black transition sm:px-4 sm:text-sm"
          :class="!isFlipped ? 'bg-ink text-paper shadow-sm' : 'text-ink/60 hover:text-ink'"
          type="button"
          data-history-side="front"
          :aria-pressed="!isFlipped"
          @click="setFlipped(false)"
        >
          {{ t('stickerPreview.frontSide') }}
        </button>
        <button
          class="rounded-full px-3 py-1.5 text-xs font-black transition sm:px-4 sm:text-sm"
          :class="isFlipped ? 'bg-ink text-paper shadow-sm' : 'text-ink/60 hover:text-ink'"
          type="button"
          data-history-side="back"
          :aria-pressed="isFlipped"
          @click="setFlipped(true)"
        >
          {{ t('stickerPreview.playerHistory') }}
        </button>
      </div>
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
                v-if="!historicalPlayer"
                class="absolute inset-0 h-full w-full rounded-lg object-cover shadow-xl [backface-visibility:hidden]"
                :src="image"
                :alt="displayName"
              />
              <div
                v-else
                class="absolute inset-0 overflow-hidden rounded-lg bg-[#173b35] text-[#f4edd9] shadow-xl [backface-visibility:hidden]"
                data-historical-front
              >
                <img
                  class="h-full w-full object-cover"
                  :src="image"
                  :alt="displayName"
                />
                <div
                  class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#102b28] via-[#102b28]/95 to-transparent px-4 pb-5 pt-12 text-left"
                >
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-[#d6b36f]">
                    {{ historicalPlayer.eraTitle }}
                  </p>
                  <strong class="mt-1 block text-2xl leading-tight">{{ displayName }}</strong>
                  <p v-if="historicalPlayer.position" class="mt-1 text-xs text-[#f4edd9]/70">
                    {{ historicalPlayer.position }}
                  </p>
                </div>
              </div>
              <div
                class="absolute inset-0 rounded-lg bg-ink text-paper shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <div
                  v-if="historicalPlayer"
                  class="flex h-full flex-col overflow-y-auto p-4 text-left md:p-5"
                  data-historical-back
                >
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-gold">
                    {{ historicalPlayer.eraTitle }}
                  </p>
                  <strong class="mt-1 text-xl leading-tight md:text-2xl">
                    {{ historicalPlayer.fullName }}
                  </strong>
                  <dl class="mt-3 grid gap-2 text-[10px] leading-snug md:text-xs">
                    <div v-if="historicalPlayer.tomskPeriod">
                      <dt class="font-black uppercase tracking-wide text-paper/45">
                        {{ t('stickerPreview.tomskPeriod') }}
                      </dt>
                      <dd class="mt-0.5 text-paper/85">{{ historicalPlayer.tomskPeriod }}</dd>
                    </div>
                    <div v-if="historicalPlayer.position">
                      <dt class="font-black uppercase tracking-wide text-paper/45">
                        {{ t('stickerPreview.position') }}
                      </dt>
                      <dd class="mt-0.5 text-paper/85">{{ historicalPlayer.position }}</dd>
                    </div>
                  </dl>
                  <p class="mt-3 text-[10px] leading-relaxed text-paper/80 md:text-xs">
                    {{ historicalPlayer.biography }}
                  </p>
                  <p class="mt-2 text-[10px] leading-relaxed text-paper/80 md:text-xs">
                    {{ historicalPlayer.contribution }}
                  </p>
                  <ul
                    v-if="historicalPlayer.keyMoments?.length"
                    class="mt-3 space-y-1 border-t border-paper/15 pt-3 text-[9px] leading-snug text-paper/70 md:text-[11px]"
                  >
                    <li
                      v-for="moment in historicalPlayer.keyMoments"
                      :key="moment"
                      class="flex gap-1.5"
                    >
                      <i class="pi pi-circle-fill mt-1 text-[4px] text-gold" aria-hidden="true" />
                      <span>{{ moment }}</span>
                    </li>
                  </ul>
                </div>
                <div
                  v-else-if="card && instance"
                  class="flex h-full flex-col justify-between p-5 md:p-7"
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
        v-if="!readOnly && instance && !instance.preparation && instance.location !== 'album'"
        :label="t('stickerTray.prepareAction')"
        icon="pi pi-sparkles"
        type="button"
        @click="prepare"
      />
      <Button
        v-if="!readOnly && instance"
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
