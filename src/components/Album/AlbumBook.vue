<script setup lang="ts">
import { computed, onBeforeUnmount, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

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
const turnDuration: number = 520

// Запускает переворот одной страницы и синхронизирует индекс после анимации.
const turnTo = (targetPage: number, direction: TurnDirection, action: TurnAction): void => {
  if (isTurning.value || targetPage < 0 || targetPage >= props.pages.length) return
  turnDirection.value = direction
  isTurning.value = true
  turnTimer = setTimeout((): void => {
    if (action === 'next') emit('next')
    else emit('previous')
    isTurning.value = false
  }, turnDuration)
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
  <div class="flex h-full min-h-0 w-full flex-col items-center justify-center">
    <div
      class="album-book__viewport relative min-h-0 [perspective:1800px]"
      :class="
        !isOpen || displayMode === 'page' || isStandaloneStartPage
          ? 'album-book__page-focus'
          : 'album-book__spread'
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
        class="album-page-turn__sheet pointer-events-none absolute inset-y-0 z-10 [transform-style:preserve-3d]"
        :class="[
          turnDirection === 'forward' ? 'album-page-turn--forward' : 'album-page-turn--backward',
          displayMode === 'spread' && !isStandaloneStartPage
            ? 'album-page-turn__sheet--spread'
            : 'album-page-turn__sheet--page',
        ]"
        aria-hidden="true"
      >
        <div class="album-page-turn__skeleton">
          <span class="album-page-turn__skeleton-line album-page-turn__skeleton-line--short" />
          <span class="album-page-turn__skeleton-block" />
          <span class="album-page-turn__skeleton-line" />
          <span class="album-page-turn__skeleton-line album-page-turn__skeleton-line--medium" />
        </div>
      </div>

      <template v-if="isOpen">
        <Button
          v-if="currentPage > 0"
          class="album-book__edge-button album-book__edge-button--previous"
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
          class="album-book__edge-button album-book__edge-button--next"
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
        v-if="isOpen && showContentsShortcut"
        class="album-book__contents-button"
        icon="pi pi-list"
        :label="t('album.contents.label')"
        :aria-label="t('album.contents.back')"
        :title="t('album.contents.back')"
        severity="secondary"
        type="button"
        @click.stop="openContents"
      />

      <Button
        class="album-book__corner-button"
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

<style scoped>
.album-book__viewport {
  max-width: 100%;
}

.album-book__page-focus {
  flex: 1 1 auto;
  height: 100%;
  width: auto;
  aspect-ratio: 32 / 25;
}

.album-book__page-focus :deep(article) {
  height: 100%;
  width: 100%;
}

.album-book__spread {
  display: grid;
  flex: 0 1 auto;
  width: min(100%, calc((100dvh - 20.5rem) * 2.56));
  grid-template-columns: repeat(2, minmax(0, 1fr));
  aspect-ratio: 64 / 25;
  box-shadow: 0 18px 50px rgb(var(--color-ink) / 0.24);
}

.album-book__spread :deep(article) {
  height: 100%;
  box-shadow: none;
}

.album-book__edge-button {
  position: absolute;
  top: 50%;
  z-index: 30;
  display: grid;
  width: 2.5rem;
  min-width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid rgb(247 243 235 / 42%);
  border-radius: 50%;
  background: rgb(23 33 43 / 88%);
  box-shadow: 0 8px 22px rgb(23 33 43 / 30%);
  color: #f7f3eb;
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
  backdrop-filter: blur(5px);
}

.album-book__edge-button--previous {
  left: clamp(0.35rem, 1cqw, 0.75rem);
}
.album-book__edge-button--next {
  right: clamp(0.35rem, 1cqw, 0.75rem);
}

.album-book__edge-button:hover:not(:disabled) {
  background: #e5b95c;
  color: #17212b;
  transform: translateY(-50%) scale(1.06);
}

.album-book__edge-button:focus-visible {
  outline: 3px solid #e5b95c;
  outline-offset: 3px;
}

.album-book__edge-button:disabled {
  cursor: wait;
  opacity: 0.56;
}

.album-book__corner-button {
  position: absolute;
  top: clamp(0.45rem, 1cqw, 0.75rem);
  right: clamp(0.45rem, 1cqw, 0.75rem);
  z-index: 40;
  display: grid;
  width: 2.5rem;
  min-width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid rgb(247 243 235 / 42%);
  border-radius: 50%;
  background: rgb(23 33 43 / 88%);
  box-shadow: 0 8px 22px rgb(23 33 43 / 30%);
  color: #f7f3eb;
  backdrop-filter: blur(5px);
}

.album-book__contents-button.p-button:not(.p-button-text):not(.p-button-outlined) {
  position: absolute;
  top: clamp(0.45rem, 1cqw, 0.75rem);
  right: clamp(3.35rem, 4cqw, 4rem);
  z-index: 40;
  height: 2.5rem;
  border: 1px solid rgb(var(--color-paper) / 72%);
  border-radius: 999px;
  background: var(--prime-accent);
  box-shadow:
    0 0 0 2px rgb(var(--color-ink) / 16%),
    0 8px 22px rgb(var(--color-ink) / 30%);
  color: #fff;
  backdrop-filter: blur(5px);
}

.album-book__contents-button.p-button:not(.p-button-text):not(.p-button-outlined):hover {
  border-color: rgb(var(--color-paper));
  background: var(--prime-accent);
  color: #fff;
  filter: brightness(1.08);
}

.album-book__contents-button.p-button:focus-visible {
  outline: 3px solid var(--prime-accent);
  outline-offset: 3px;
}

.album-book__corner-button:focus-visible {
  outline: 3px solid #e5b95c;
  outline-offset: 3px;
}

.album-page-turn--forward,
.album-page-turn--backward {
  animation-duration: 520ms;
  animation-timing-function: cubic-bezier(0.2, 0.68, 0.2, 1);
  animation-fill-mode: both;
  transform-style: preserve-3d;
}

.album-page-turn__sheet--page {
  left: 0;
  width: 100%;
}

.album-page-turn__sheet--spread {
  width: 50%;
}

.album-page-turn--forward {
  right: 0;
  transform-origin: left center;
  animation-name: album-page-turn-forward;
}
.album-page-turn--backward {
  left: 0;
  transform-origin: right center;
  animation-name: album-page-turn-backward;
}

.album-page-turn__skeleton {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 5%;
  overflow: hidden;
  border: 1px solid rgb(var(--color-ink) / 10%);
  background: rgb(var(--color-paper));
  padding: 9%;
  backface-visibility: hidden;
  box-shadow: -14px 0 24px rgb(var(--color-ink) / 0.22);
}

.album-page-turn__skeleton::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgb(255 255 255 / 48%) 48%, transparent 66%);
  content: '';
  animation: album-page-skeleton-shimmer 1.15s ease-in-out infinite;
  transform: translateX(-100%);
}

.album-page-turn__skeleton-line,
.album-page-turn__skeleton-block {
  display: block;
  border-radius: 0.35rem;
  background: rgb(var(--color-ink) / 9%);
}

.album-page-turn__skeleton-line {
  height: 5%;
  width: 78%;
}

.album-page-turn__skeleton-line--short {
  width: 34%;
}

.album-page-turn__skeleton-line--medium {
  width: 58%;
}

.album-page-turn__skeleton-block {
  height: 58%;
  width: 100%;
}

@keyframes album-page-turn-forward {
  from {
    transform: rotateY(-100deg);
  }
  to {
    transform: rotateY(0deg);
  }
}

@keyframes album-page-turn-backward {
  from {
    transform: rotateY(100deg);
  }
  to {
    transform: rotateY(0deg);
  }
}

@keyframes album-page-skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}

@media (max-width: 767px) {
  .album-book__page-focus {
    flex: 0 0 auto;
    height: auto;
    width: 100%;
  }

  .album-book__edge-button {
    width: 2.25rem;
    min-width: 2.25rem;
    height: 2.25rem;
  }

  .album-book__corner-button {
    width: 2.25rem;
    min-width: 2.25rem;
    height: 2.25rem;
  }

  .album-book__contents-button.p-button:not(.p-button-text):not(.p-button-outlined) {
    right: 3.1rem;
    width: 2.25rem;
    min-width: 2.25rem;
    height: 2.25rem;
    padding: 0;
  }

  .album-book__contents-button :deep(.p-button-label) {
    display: none;
  }

  .album-book__contents-button :deep(.p-button-icon) {
    margin: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-book__edge-button {
    transition: none;
  }

  .album-page-turn__skeleton::after {
    animation: none;
  }
}
</style>
