<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { observeNearViewport } from '@/utils/nearViewportObserver'

type ImageFit = 'contain' | 'cover' | 'fill'
type ImageStatus = 'loading' | 'loaded' | 'error'

interface Props {
  src?: string
  alt?: string
  fit?: ImageFit
  eager?: boolean
  defer?: boolean
  detailedError?: boolean
  retryable?: boolean
  showLoader?: boolean
  imageClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: '',
  fit: 'cover',
  eager: false,
  defer: false,
  detailedError: false,
  retryable: false,
  showLoader: true,
  imageClass: '',
})
const emit = defineEmits<{
  load: []
  error: []
}>()
const { t } = useI18n()
const container: Ref<HTMLElement | undefined> = ref(undefined)
const status: Ref<ImageStatus> = ref(props.src ? 'loading' : 'error')
const attempt: Ref<number> = ref(0)
const isRequestActive: Ref<boolean> = ref(props.eager || !props.defer)
let stopObserving: (() => void) | undefined
const fitClass: ComputedRef<string> = computed((): string => `object-${props.fit}`)
const requestSrc: ComputedRef<string> = computed((): string => {
  if (!props.src || attempt.value === 0) return props.src
  const separator: string = props.src.includes('?') ? '&' : '?'
  return `${props.src}${separator}image-retry=${attempt.value}`
})

watch(
  (): string => props.src,
  (src: string): void => {
    status.value = src ? 'loading' : 'error'
    attempt.value = 0
  },
)

onMounted((): void => {
  if (isRequestActive.value || !container.value) return
  stopObserving = observeNearViewport(container.value, (): void => {
    isRequestActive.value = true
    stopObserving = undefined
  })
})

onBeforeUnmount((): void => stopObserving?.())

const handleLoad = async (event: Event): Promise<void> => {
  const loadedRequest: string = requestSrc.value
  const image: HTMLImageElement = event.currentTarget as HTMLImageElement
  if (typeof image.decode === 'function') {
    try {
      await image.decode()
    } catch {
      // load уже подтвердил доступность файла; отдельная ошибка decode не скрывает изображение.
    }
  }
  if (loadedRequest !== requestSrc.value) return
  status.value = 'loaded'
  emit('load')
}

const handleError = (): void => {
  status.value = 'error'
  emit('error')
}

const retry = (): void => {
  if (!props.src) return
  status.value = 'loading'
  attempt.value += 1
}
</script>

<template>
  <div
    ref="container"
    class="relative overflow-hidden"
    :aria-busy="isRequestActive && status === 'loading'"
  >
    <img
      v-if="src && isRequestActive"
      :key="`${src}:${attempt}`"
      class="absolute inset-0 h-full w-full transition-opacity duration-200"
      :class="[fitClass, imageClass, status === 'loaded' ? 'opacity-100' : 'opacity-0']"
      :src="requestSrc"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
      draggable="false"
      @load="handleLoad"
      @error="handleError"
    />

    <div
      v-if="showLoader && isRequestActive && status === 'loading'"
      class="pointer-events-none absolute inset-0 z-10 overflow-hidden bg-ink/[0.07] after:absolute after:inset-0 after:-translate-x-full after:animate-album-page-skeleton-shimmer after:bg-[linear-gradient(105deg,transparent_30%,rgb(255_255_255/0.62)_48%,transparent_66%)] after:content-[''] motion-reduce:after:animate-none"
      role="status"
      data-image-loader
      :aria-label="t('common.imageLoading')"
    />

    <div
      v-if="status === 'error'"
      class="absolute inset-0 z-30 flex items-center justify-center bg-paper/95 p-2 text-center text-ink"
      role="alert"
    >
      <button
        v-if="src && retryable"
        class="inline-flex max-w-full flex-col items-center gap-1 rounded px-2 py-1 text-xs font-bold transition-colors hover:bg-coral/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-coral"
        type="button"
        :aria-label="t('common.imageRetry')"
        :title="t('common.imageRetry')"
        @click.stop="retry"
      >
        <i class="pi pi-refresh text-lg text-coral" aria-hidden="true" />
        <span v-if="detailedError">{{ t('common.imageLoadError') }}</span>
      </button>
      <span v-else class="inline-flex flex-col items-center gap-1 text-ink/55">
        <i class="pi pi-image text-lg" aria-hidden="true" />
        <span v-if="detailedError" class="text-xs font-bold">
          {{ t('common.imageLoadError') }}
        </span>
      </span>
    </div>

    <div v-if="$slots.default" class="absolute inset-0 z-20">
      <slot />
    </div>
  </div>
</template>
