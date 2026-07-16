<script setup lang="ts">
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
  <article
    class="relative min-w-0 overflow-hidden bg-ink shadow-[0_18px_50px_rgb(var(--color-ink)/0.24)]"
    :class="{ 'h-full flex-1': fill }"
    :style="{ backgroundImage: `url(${page.image})`, backgroundSize: '100% 100%', backgroundPosition: 'center' }"
    :aria-label="page.title"
  >
    <!-- HTML-слой остаётся единственным источником интерактивных координат. -->
    <div class="absolute inset-0">
      <slot />
    </div>
  </article>
</template>
