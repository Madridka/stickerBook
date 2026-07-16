<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type Ref } from 'vue'
import Button from 'primevue/button'
import { useI18n } from 'vue-i18n'
import AlbumPage, { type AlbumPageData } from '@/components/Album/AlbumPage.vue'

interface Props {
  pages: AlbumPageData[]
  currentPage: number
  isOpen: boolean
}

interface Emits {
  open: []
  close: []
  previous: []
  next: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const visiblePageIndexes = computed((): number[] =>
  [props.currentPage, props.currentPage + 1].filter((pageIndex: number): boolean => pageIndex < props.pages.length),
)
const isSpreadOnly = computed((): boolean => props.pages.length === 2)
const { t } = useI18n()
type TurnDirection = 'forward' | 'backward'
type TurnAction = keyof Emits
const isTurning: Ref<boolean> = ref(false)
const turnDirection: Ref<TurnDirection> = ref('forward')
const turningPage: Ref<AlbumPageData | undefined> = ref(undefined)
let turnTimer: ReturnType<typeof setTimeout> | undefined

// Запускает 3D-переворот и передаёт изменение страницы после завершения анимации
const turnTo = (targetPage: number, direction: TurnDirection, action: TurnAction): void => {
  if (isTurning.value || targetPage < 0 || targetPage >= props.pages.length) return

  turningPage.value = props.pages[targetPage]
  turnDirection.value = direction
  isTurning.value = true
  turnTimer = setTimeout((): void => {
    emit(action)
    isTurning.value = false
    turningPage.value = undefined
  }, 620)
}

// Открывает обложку тем же жестом, что и переход на следующую страницу
const openBook = (): void => turnTo(1, 'forward', 'open')

// Перелистывает страницу вперёд
const nextPage = (): void => turnTo(props.currentPage + 2, 'forward', 'next')

// Перелистывает страницу назад или закрывает альбом с первой страницы
const previousPage = (): void => {
  const action: TurnAction = props.currentPage <= 1 ? 'close' : 'previous'
  turnTo(props.currentPage - 2, 'backward', action)
}

// Закрывает альбом с финальной страницы плавным возвратом к обложке
const closeBook = (): void => turnTo(0, 'backward', 'close')

onBeforeUnmount((): void => {
  if (turnTimer) clearTimeout(turnTimer)
})
</script>

<template>
  <div class="flex min-h-0 w-full flex-col items-center">
    <div
      class="relative [perspective:1800px]"
      :class="isOpen || isSpreadOnly ? 'album-book__spread' : 'album-book__page--closed'"
    >
      <template v-if="isOpen">
        <AlbumPage v-for="pageIndex in visiblePageIndexes" :key="pageIndex" :page="pages[pageIndex]" :fill="true">
          <slot v-if="!isTurning" :page-index="pageIndex" />
        </AlbumPage>
      </template>
      <AlbumPage v-else :page="pages[currentPage]">
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

    <div v-if="!isSpreadOnly" class="mt-4 flex min-h-10 items-center justify-center gap-2">
      <Button
        v-if="!isOpen"
        :label="t('album.open')"
        icon="pi pi-book"
        type="button"
        @click="openBook"
      />
      <template v-else>
        <Button
          :label="t('album.previous')"
          icon="pi pi-arrow-left"
          outlined
          type="button"
          @click="previousPage"
        />
        <span class="px-2 text-sm font-bold text-ink/60">{{ Math.ceil(currentPage / 2) }} / {{ Math.ceil((pages.length - 1) / 2) }}</span>
        <Button
          v-if="currentPage < pages.length - 1"
          :label="t('album.next')"
          icon="pi pi-arrow-right"
          iconPos="right"
          type="button"
          @click="nextPage"
        />
        <Button
          v-else
          :label="t('album.close')"
          icon="pi pi-times"
          type="button"
          @click="closeBook"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.album-book__page--closed :deep(article) {
  height: min(calc(100dvh - 17rem), 52rem);
}

.album-book__spread {
  display: flex;
  width: 100%;
  height: min(calc(100dvh - 25rem), 52rem);
}

.album-book__spread :deep(article) {
  min-width: 0;
  flex: 1 1 50%;
}

@media (min-width: 768px) {
  .album-book__spread {
    height: min(calc(100dvh - 20rem), 52rem);
  }
}

.album-page-turn--forward,
.album-page-turn--backward {
  transform-origin: left center;
  animation-duration: 620ms;
  animation-timing-function: cubic-bezier(0.22, 0.72, 0.22, 1);
  animation-fill-mode: both;
  transform-style: preserve-3d;
}

.album-page-turn--forward {
  animation-name: album-page-turn-forward;
}

.album-page-turn--backward {
  transform-origin: right center;
  animation-name: album-page-turn-backward;
}

.album-page-turn--forward :deep(article),
.album-page-turn--backward :deep(article) {
  box-shadow: -14px 0 24px rgb(var(--color-ink) / 0.22);
  backface-visibility: hidden;
}

@keyframes album-page-turn-forward {
  from { transform: rotateY(-180deg); }
  to { transform: rotateY(0deg); }
}

@keyframes album-page-turn-backward {
  from { transform: rotateY(180deg); }
  to { transform: rotateY(0deg); }
}
</style>
