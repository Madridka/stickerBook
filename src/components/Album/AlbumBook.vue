<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import AlbumPage, { type AlbumPageData } from '@/components/Album/AlbumPage.vue'

interface Props {
  pages: AlbumPageData[]
  currentPage: number
  isOpen: boolean
  displayMode?: 'spread' | 'page'
  openStartPage?: number
}

interface Emits {
  open: []
  close: []
  previous: []
  next: []
}

const props = withDefaults(defineProps<Props>(), {
  displayMode: 'spread',
  openStartPage: 0,
})
const emit = defineEmits<Emits>()
const { t } = useI18n()
const pageStep: ComputedRef<number> = computed((): number => (props.displayMode === 'page' ? 1 : 2))
const visiblePageIndexes: ComputedRef<number[]> = computed((): number[] => {
  if (props.displayMode === 'page') return [props.currentPage]
  return [props.currentPage, props.currentPage + 1].filter(
    (pageIndex: number): boolean => pageIndex < props.pages.length,
  )
})
type TurnDirection = 'forward' | 'backward'
type TurnAction = 'previous' | 'next'
const isTurning: Ref<boolean> = ref(false)
const turnDirection: Ref<TurnDirection> = ref('forward')
const turningPage: Ref<AlbumPageData | undefined> = ref(undefined)
let turnTimer: ReturnType<typeof setTimeout> | undefined

// Запускает переворот одной страницы и синхронизирует индекс после анимации.
const turnTo = (targetPage: number, direction: TurnDirection, action: TurnAction): void => {
  if (isTurning.value || targetPage < props.openStartPage || targetPage >= props.pages.length)
    return
  turningPage.value = props.pages[targetPage]
  turnDirection.value = direction
  isTurning.value = true
  turnTimer = setTimeout((): void => {
    if (action === 'next') emit('next')
    else emit('previous')
    isTurning.value = false
    turningPage.value = undefined
  }, 420)
}

const openBook = (): void => emit('open')
const nextPage = (): void => turnTo(props.currentPage + pageStep.value, 'forward', 'next')
const previousPage = (): void => turnTo(props.currentPage - pageStep.value, 'backward', 'previous')
const closeBook = (): void => emit('close')

onBeforeUnmount((): void => {
  if (turnTimer) clearTimeout(turnTimer)
})
</script>

<template>
  <div class="flex h-full min-h-0 w-full flex-col items-center justify-center">
    <div
      class="relative min-h-0 max-w-full [perspective:1800px]"
      :class="
        !isOpen || displayMode === 'page'
          ? 'h-full w-auto flex-auto aspect-[32/25] [&_article]:h-full [&_article]:w-full max-md:h-auto max-md:w-full max-md:flex-none'
          : 'grid w-[min(100%,calc((100dvh-20.5rem)*2.56))] flex-initial grid-cols-2 aspect-[64/25] shadow-[0_18px_50px_rgb(var(--color-ink)/0.24)] [&_article]:h-full [&_article]:shadow-none'
      "
    >
      <template v-if="isOpen">
        <AlbumPage
          v-for="pageIndex in visiblePageIndexes"
          :key="pageIndex"
          :page="pages[pageIndex]"
          :fill="true"
        >
          <slot v-if="!isTurning" :page-index="pageIndex" />
        </AlbumPage>
      </template>
      <AlbumPage v-else :page="pages[currentPage]" :fill="true">
        <slot v-if="!isTurning" :page-index="currentPage" />
      </AlbumPage>

      <div
        v-if="isTurning && turningPage"
        class="pointer-events-none absolute inset-0 z-10 [transform-style:preserve-3d] [&_article]:[backface-visibility:hidden] [&_article]:shadow-[-14px_0_24px_rgb(var(--color-ink)/0.22)]"
        :class="
          turnDirection === 'forward'
            ? 'origin-left animate-album-page-turn-forward'
            : 'origin-right animate-album-page-turn-backward'
        "
      >
        <AlbumPage :page="turningPage" :fill="true" />
      </div>

      <template v-if="isOpen">
        <Button
          v-if="currentPage > openStartPage"
          class="absolute left-[clamp(0.35rem,1cqw,0.75rem)] top-1/2 z-30 !grid !h-10 !min-w-10 !w-10 !-translate-y-1/2 !cursor-pointer !place-items-center !rounded-full !border !border-[rgb(247_243_235/42%)] !bg-[rgb(23_33_43/88%)] !text-[#f7f3eb] !shadow-[0_8px_22px_rgb(23_33_43/30%)] !backdrop-blur-[5px] !transition-[background-color,color,transform] !duration-[160ms] !ease-[ease] [&:hover:not(:disabled)]:!scale-[1.06] [&:hover:not(:disabled)]:!bg-[#e5b95c] [&:hover:not(:disabled)]:!text-[#17212b] focus-visible:!outline focus-visible:!outline-[3px] focus-visible:!outline-offset-[3px] focus-visible:!outline-[#e5b95c] disabled:!cursor-wait disabled:!opacity-[0.56] motion-reduce:!transition-none max-md:!h-9 max-md:!min-w-9 max-md:!w-9"
          icon="pi pi-chevron-left"
          rounded
          type="button"
          :aria-label="t('album.previous')"
          :title="t('album.previous')"
          :disabled="isTurning"
          @click.stop="previousPage"
        />
        <Button
          v-if="currentPage < pages.length - pageStep"
          class="absolute right-[clamp(0.35rem,1cqw,0.75rem)] top-1/2 z-30 !grid !h-10 !min-w-10 !w-10 !-translate-y-1/2 !cursor-pointer !place-items-center !rounded-full !border !border-[rgb(247_243_235/42%)] !bg-[rgb(23_33_43/88%)] !text-[#f7f3eb] !shadow-[0_8px_22px_rgb(23_33_43/30%)] !backdrop-blur-[5px] !transition-[background-color,color,transform] !duration-[160ms] !ease-[ease] [&:hover:not(:disabled)]:!scale-[1.06] [&:hover:not(:disabled)]:!bg-[#e5b95c] [&:hover:not(:disabled)]:!text-[#17212b] focus-visible:!outline focus-visible:!outline-[3px] focus-visible:!outline-offset-[3px] focus-visible:!outline-[#e5b95c] disabled:!cursor-wait disabled:!opacity-[0.56] motion-reduce:!transition-none max-md:!h-9 max-md:!min-w-9 max-md:!w-9"
          icon="pi pi-chevron-right"
          rounded
          type="button"
          :aria-label="t('album.next')"
          :title="t('album.next')"
          :disabled="isTurning"
          @click.stop="nextPage"
        />
      </template>

      <Button
        class="absolute right-[clamp(0.45rem,1cqw,0.75rem)] top-[clamp(0.45rem,1cqw,0.75rem)] z-40 !grid !h-10 !min-w-10 !w-10 !place-items-center !rounded-full !border !border-[rgb(247_243_235/42%)] !bg-[rgb(23_33_43/88%)] !text-[#f7f3eb] !shadow-[0_8px_22px_rgb(23_33_43/30%)] !backdrop-blur-[5px] focus-visible:!outline focus-visible:!outline-[3px] focus-visible:!outline-offset-[3px] focus-visible:!outline-[#e5b95c] max-md:!h-9 max-md:!min-w-9 max-md:!w-9"
        :aria-label="t(isOpen ? 'album.close' : 'album.open')"
        :title="t(isOpen ? 'album.close' : 'album.open')"
        :icon="isOpen ? 'pi pi-times' : 'pi pi-book'"
        rounded
        type="button"
        @click="isOpen ? closeBook() : openBook()"
      />
    </div>
  </div>
</template>
