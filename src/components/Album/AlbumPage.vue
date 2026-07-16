<script setup lang="ts">
export interface AlbumPageData {
  id: string
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
    class="album-page relative aspect-[390/844] h-[min(calc(100dvh-12rem),52rem)] w-auto max-w-full shrink-0 overflow-hidden bg-[#0d4f42] shadow-[0_18px_50px_rgb(var(--color-ink)/0.22)]"
    :class="{ 'h-full w-full max-w-none aspect-auto': props.fill }"
    :aria-label="page.title"
  >
    <div class="album-page__frame absolute inset-[3%] border border-[#d8b45b]/60 bg-[#f7edcf] p-[4%]">
      <div class="album-page__binding absolute inset-y-0 left-0 w-[3%] bg-[#c52b32]" />
      <div class="album-page__topline absolute left-[9%] right-[5%] top-[4%] h-[4%] border-b-2 border-[#d8b45b]" />
      <div class="album-page__title absolute left-[9%] top-[5%] text-[clamp(0.55rem,1.8vw,0.9rem)] font-black uppercase tracking-[0.16em] text-[#123d36]">
        StickerBook · {{ page.id }}
      </div>
      <div class="album-page__paper absolute inset-x-[7%] bottom-[7%] top-[13%] rounded-sm border border-[#d8b45b]/50 bg-[#fff8e5] shadow-inner" />
      <div class="album-page__footer absolute bottom-[4%] left-[9%] right-[5%] h-[5%] rounded-sm border border-[#a91f29] bg-[#c52b32]" />
    </div>
    <!-- Интерактивный слой совпадает с canvas страницы и не зависит от декоративной рамки. -->
    <div class="absolute inset-0 z-10">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.album-page__frame {
  box-shadow: inset 0 0 0 3px rgb(216 180 91 / 0.18), 12px 0 0 rgb(6 46 39 / 0.18);
}

.album-page__frame::before {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(135deg, transparent 0 14px, rgb(216 180 91 / 0.14) 15px 16px);
  content: '';
  pointer-events: none;
}
</style>
