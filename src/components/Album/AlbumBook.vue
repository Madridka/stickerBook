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
}

interface Emits {
  open: []
  close: []
  previous: []
  next: []
}

const props = withDefaults(defineProps<Props>(), { displayMode: 'spread' })
const emit = defineEmits<Emits>()
const { t } = useI18n()
const pageStep: ComputedRef<number> = computed((): number => props.displayMode === 'page' ? 1 : 2)
const visiblePageIndexes: ComputedRef<number[]> = computed((): number[] => {
  if (props.displayMode === 'page') return [props.currentPage]
  return [props.currentPage, props.currentPage + 1]
    .filter((pageIndex: number): boolean => pageIndex < props.pages.length)
})
const isSpreadOnly: ComputedRef<boolean> = computed(
  (): boolean => props.displayMode === 'spread' && props.pages.length === 2,
)
type TurnDirection = 'forward' | 'backward'
type TurnAction = keyof Emits
const isTurning: Ref<boolean> = ref(false)
const turnDirection: Ref<TurnDirection> = ref('forward')
const turningPage: Ref<AlbumPageData | undefined> = ref(undefined)
let turnTimer: ReturnType<typeof setTimeout> | undefined

// Запускает переворот одной страницы и синхронизирует индекс после анимации.
const turnTo = (targetPage: number, direction: TurnDirection, action: TurnAction): void => {
  if (isTurning.value || targetPage < 0 || targetPage >= props.pages.length) return
  turningPage.value = props.pages[targetPage]
  turnDirection.value = direction
  isTurning.value = true
  turnTimer = setTimeout((): void => {
    emit(action)
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
  <div class="flex h-full min-h-0 w-full flex-col items-center gap-2">
    <div
      class="album-book__viewport relative min-h-0 [perspective:1800px]"
      :class="displayMode === 'page' ? 'album-book__page-focus' : 'album-book__spread'"
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
        class="pointer-events-none absolute inset-0 z-10 [transform-style:preserve-3d]"
        :class="turnDirection === 'forward' ? 'album-page-turn--forward' : 'album-page-turn--backward'"
      >
        <AlbumPage :page="turningPage" :fill="true" />
      </div>
    </div>

    <div v-if="displayMode === 'page' || !isSpreadOnly" class="flex h-10 shrink-0 items-center justify-center gap-2">
      <Button
        v-if="!isOpen"
        :label="t('album.open')"
        icon="pi pi-book"
        size="small"
        type="button"
        @click="openBook"
      />
      <template v-else>
        <Button
          v-if="currentPage > 0"
          :label="t('album.previous')"
          icon="pi pi-arrow-left"
          outlined
          size="small"
          type="button"
          @click="previousPage"
        />
        <span class="min-w-16 px-2 text-center text-sm font-bold text-paper/70">
          {{ currentPage + 1 }} / {{ pages.length }}
        </span>
        <Button
          v-if="currentPage < pages.length - pageStep"
          :label="t('album.next')"
          icon="pi pi-arrow-right"
          icon-pos="right"
          size="small"
          type="button"
          @click="nextPage"
        />
        <Button
          v-else-if="displayMode === 'spread'"
          :label="t('album.close')"
          icon="pi pi-times"
          size="small"
          type="button"
          @click="closeBook"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.album-book__viewport {
  flex: 1 1 auto;
  max-width: 100%;
}

.album-book__page-focus {
  height: 100%;
  width: auto;
  aspect-ratio: 3 / 2;
}

.album-book__page-focus :deep(article) {
  height: 100%;
  width: 100%;
}

.album-book__spread {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  aspect-ratio: 3 / 1;
}

.album-book__spread :deep(article) {
  height: 100%;
}

.album-page-turn--forward,
.album-page-turn--backward {
  transform-origin: left center;
  animation-duration: 420ms;
  animation-timing-function: cubic-bezier(0.22, 0.72, 0.22, 1);
  animation-fill-mode: both;
  transform-style: preserve-3d;
}

.album-page-turn--forward { animation-name: album-page-turn-forward; }
.album-page-turn--backward {
  transform-origin: right center;
  animation-name: album-page-turn-backward;
}

.album-page-turn--forward :deep(article),
.album-page-turn--backward :deep(article) {
  backface-visibility: hidden;
  box-shadow: -14px 0 24px rgb(var(--color-ink) / 0.22);
}

@keyframes album-page-turn-forward {
  from { transform: rotateY(-100deg); }
  to { transform: rotateY(0deg); }
}

@keyframes album-page-turn-backward {
  from { transform: rotateY(100deg); }
  to { transform: rotateY(0deg); }
}

@media (max-width: 767px) {
  .album-book__page-focus {
    height: auto;
    width: 100%;
  }
}
</style>
