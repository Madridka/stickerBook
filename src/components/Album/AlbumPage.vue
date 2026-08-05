<script setup lang="ts">
import LoadableImage from '@/components/ui/LoadableImage.vue'

export interface AlbumPageData {
  id: string
  title: string
  image: string
}

interface Props {
  page: AlbumPageData
  fill?: boolean
}

defineProps<Props>()
</script>

<template>
  <LoadableImage
    class="relative min-w-0 bg-ink shadow-[0_18px_50px_rgb(var(--color-ink)/0.24)]"
    :class="{ 'h-full flex-1': fill }"
    :src="page.image"
    :alt="page.title"
    fit="fill"
    eager
    detailed-error
    retryable
    :aria-label="page.title"
  >
    <!-- HTML-слой остаётся единственным источником интерактивных координат. -->
    <div class="absolute inset-0">
      <slot />
    </div>
  </LoadableImage>
</template>
