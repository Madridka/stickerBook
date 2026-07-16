<script setup lang="ts">
export interface AlbumPageData {
  id: string
  image: string
  title: string
}

interface Props {
  page: AlbumPageData
  fill?: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <article
    class="relative aspect-[390/844] h-[min(calc(100dvh-12rem),52rem)] w-auto max-w-full shrink-0 overflow-hidden bg-paper bg-cover bg-center bg-no-repeat shadow-[0_18px_50px_rgb(var(--color-ink)/0.22)]"
    :class="{ 'h-full w-full max-w-none aspect-auto': props.fill }"
    :style="{ backgroundImage: `url(${page.image})` }"
    :aria-label="page.title"
  >
    <!-- HTML-слой поверх фоновой PNG-страницы для будущего содержимого альбома -->
    <div class="absolute inset-0">
      <slot />
    </div>
  </article>
</template>
