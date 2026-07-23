<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ALBUM_VIEW_CONFIG } from '@/data/mainConst'

import Button from 'primevue/button'

import AlbumPage, { type AlbumPageData } from '@/components/Album/AlbumPage.vue'

interface Props {
  pages: AlbumPageData[]
  currentPage: number
  isOpen: boolean
  displayMode?: 'spread' | 'page'
  openStartPage?: number
  showContentsShortcut?: boolean
}

interface Emits {
  open: []
  close: []
  previous: []
  next: []
  contents: []
}

const props = withDefaults(defineProps<Props>(), {
  displayMode: 'spread',
  openStartPage: 0,
})
const emit = defineEmits<Emits>()
const { t } = useI18n()
const pageStep: ComputedRef<number> = computed((): number => (props.displayMode === 'page' ? 1 : 2))
const isStandaloneStartPage: ComputedRef<boolean> = computed(
  (): boolean => props.currentPage < props.openStartPage,
)
const visiblePageIndexes: ComputedRef<number[]> = computed((): number[] => {
  if (props.displayMode === 'page' || isStandaloneStartPage.value) return [props.currentPage]
  return [props.currentPage, props.currentPage + 1].filter(
    (pageIndex: number): boolean => pageIndex < props.pages.length,
  )
})
type TurnDirection = 'forward' | 'backward'
type TurnAction = 'previous' | 'next'
const isTurning: Ref<boolean> = ref(false)
const turnDirection: Ref<TurnDirection> = ref('forward')
let turnTimer: ReturnType<typeof setTimeout> | undefined

// Запускает переворот одной страницы и синхронизирует индекс после анимации.
const turnTo = (targetPage: number, direction: TurnDirection, action: TurnAction): void => {
  if (isTurning.value || targetPage < 0 || targetPage >= props.pages.length) return
  turnDirection.value = direction
  isTurning.value = true
  turnTimer = setTimeout((): void => {
    if (action === 'next') emit('next')
    else emit('previous')
    isTurning.value = false
  }, ALBUM_VIEW_CONFIG.pageTurnDurationMs)
}

const openBook = (): void => emit('open')
const nextPage = (): void =>
  turnTo(
    isStandaloneStartPage.value ? props.openStartPage : props.currentPage + pageStep.value,
    'forward',
    'next',
  )
const previousPage = (): void =>
  turnTo(
    props.currentPage === props.openStartPage ? 0 : props.currentPage - pageStep.value,
    'backward',
    'previous',
  )
const closeBook = (): void => emit('close')
const openContents = (): void => emit('contents')

onBeforeUnmount((): void => {
  if (turnTimer) clearTimeout(turnTimer)
})
</script>

<template>
  <div class="relative flex h-full min-h-0 w-full flex-col items-center justify-center">
    <div
      class="relative min-h-0 max-w-full [perspective:1800px]"
      :class="
        !isOpen || displayMode === 'page' || isStandaloneStartPage
          ? 'aspect-[32/25] h-full w-auto flex-auto max-md:h-auto max-md:w-full max-md:flex-none'
          : 'grid aspect-[64/25] h-full w-auto flex-auto grid-cols-2 shadow-[0_18px_50px_rgb(var(--color-ink)/0.24)]'
      "
    >
      <template v-if="isOpen">
        <AlbumPage
          v-for="pageIndex in visiblePageIndexes"
          :key="pageIndex"
          :page="pages[pageIndex]"
          :fill="true"
          :class="
            displayMode === 'page' || isStandaloneStartPage
              ? 'h-full w-full'
              : 'h-full !shadow-none'
          "
        >
          <slot v-if="!isTurning" :page-index="pageIndex" />
        </AlbumPage>
      </template>
      <AlbumPage v-else :page="pages[currentPage]" :fill="true" class="h-full w-full">
        <slot v-if="!isTurning" :page-index="currentPage" />
      </AlbumPage>

      <button
        v-if="!isOpen"
        class="absolute inset-0 z-20 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-gold"
        type="button"
        :aria-label="t('album.open')"
        :title="t('album.open')"
        @click="openBook"
      ></button>

      <div
        v-if="isTurning"
        class="pointer-events-none absolute inset-y-0 z-10 [transform-style:preserve-3d]"
        :class="[
          turnDirection === 'forward'
            ? 'right-0 origin-left animate-album-page-turn-forward'
            : 'left-0 origin-right animate-album-page-turn-backward',
          displayMode === 'spread' && !isStandaloneStartPage ? 'w-1/2' : 'left-0 w-full',
        ]"
        aria-hidden="true"
      >
        <div
          class="relative flex h-full flex-col gap-[5%] overflow-hidden border border-ink/10 bg-paper p-[9%] shadow-[-14px_0_24px_rgb(var(--color-ink)/0.22)] [backface-visibility:hidden] after:absolute after:inset-0 after:-translate-x-full after:animate-album-page-skeleton-shimmer after:bg-[linear-gradient(105deg,transparent_30%,rgb(255_255_255/0.48)_48%,transparent_66%)] after:content-[''] motion-reduce:after:animate-none"
        >
          <span class="block h-[5%] w-[34%] rounded-[.35rem] bg-ink/[.09]" />
          <span class="block h-[58%] w-full rounded-[.35rem] bg-ink/[.09]" />
          <span class="block h-[5%] w-[78%] rounded-[.35rem] bg-ink/[.09]" />
          <span class="block h-[5%] w-[58%] rounded-[.35rem] bg-ink/[.09]" />
        </div>
      </div>

    </div>

    <div class="pointer-events-none absolute inset-0 z-[100]">
      <template v-if="isOpen">
        <div
          v-if="currentPage > 0"
          class="absolute left-[clamp(.35rem,1cqw,.75rem)] top-1/2 -translate-y-1/2"
        >
          <Button
            class="native-button pointer-events-auto"
            icon="pi pi-chevron-left"
            rounded
            raised
            severity="secondary"
            type="button"
            :aria-label="t('album.previous')"
            :title="t('album.previous')"
            :disabled="isTurning"
            @click.stop="previousPage"
          />
        </div>
        <div
          v-if="currentPage < pages.length - pageStep"
          class="absolute right-[clamp(.35rem,1cqw,.75rem)] top-1/2 -translate-y-1/2"
        >
          <Button
            class="native-button pointer-events-auto"
            icon="pi pi-chevron-right"
            rounded
            raised
            severity="secondary"
            type="button"
            :aria-label="t('album.next')"
            :title="t('album.next')"
            :disabled="isTurning"
            @click.stop="nextPage"
          />
        </div>
      </template>

      <div
        class="absolute right-[clamp(.45rem,1cqw,.75rem)] top-[clamp(.45rem,1cqw,.75rem)] flex items-center gap-2"
      >
        <Button
          v-if="isOpen && showContentsShortcut"
          class="native-button pointer-events-auto max-md:[&_.p-button-label]:hidden"
          icon="pi pi-list"
          :label="t('album.contents.label')"
          :aria-label="t('album.contents.back')"
          :title="t('album.contents.back')"
          rounded
          raised
          severity="secondary"
          type="button"
          @click.stop="openContents"
        />

        <Button
          class="native-button pointer-events-auto"
          :aria-label="t(isOpen ? 'album.close' : 'album.open')"
          :title="t(isOpen ? 'album.close' : 'album.open')"
          :icon="isOpen ? 'pi pi-times' : 'pi pi-book'"
          :severity="isOpen ? 'danger' : 'secondary'"
          rounded
          raised
          type="button"
          @click="isOpen ? closeBook() : openBook()"
        />
      </div>
    </div>
  </div>
</template>
