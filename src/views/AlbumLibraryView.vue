<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { getLibraryAlbums } from '@/data/albumRegistry'
import { useCollectionStore } from '@/stores/collection'
import type { AlbumDefinition, AlbumProgress } from '@/types'
import LoadableImage from '@/components/ui/LoadableImage.vue'

const { t } = useI18n()
const collection = useCollectionStore()
const albums: readonly AlbumDefinition[] = getLibraryAlbums()
const coverImages: Record<string, string> = import.meta.glob(
  [
    '../../assets/game/*/main/album/**/*.webp',
    '!../../assets/game/*/main/album/source/**',
  ],
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>

const getCover = (album: AlbumDefinition): string =>
  coverImages[
    `../../assets/game/${typeof album.metadata.assetAlbumId === 'string' ? album.metadata.assetAlbumId : album.id}/main/album/${album.theme.coverImage}`
  ] ?? ''

// Рассчитывает заполнение конкретного журнала только по вклеенным в него карточкам.
const getProgress = (album: AlbumDefinition): AlbumProgress =>
  collection.getAlbumProgress(album.id)
const getPlacedPercent = (album: AlbumDefinition): number => {
  const slotCount: number = album.pages.reduce(
    (total, page): number => total + page.slots.length,
    0,
  )
  return slotCount
    ? Math.min(100, Math.round((getProgress(album).placedCards / slotCount) * 100))
    : 0
}
const isCollectible = (album: AlbumDefinition): boolean => album.cards.length > 0
</script>

<template>
  <!-- Каталог оставляет свободное рабочее пространство для будущих журналов. -->
  <section
    class="flex h-full min-h-0 w-full flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-paper pr-1"
  >
    <header class="shrink-0 pb-3">
      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-coral max-sm:hidden">
        {{ t('app.album') }}
      </p>
      <h1 class="text-2xl font-black tracking-tight sm:mt-0.5 sm:text-3xl">
        {{ t('album.library.title') }}
      </h1>
      <p class="mt-0.5 hidden text-xs text-ink/55 md:block">{{ t('album.library.text') }}</p>
    </header>

    <div
      class="grid min-h-0 grid-cols-2 content-start gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <RouterLink
        v-for="album in albums"
        :key="album.id"
        :to="album.route"
        class="group block rounded-lg p-1.5 outline-none transition-colors hover:bg-coral/10 focus-visible:bg-coral/10 focus-visible:ring-2 focus-visible:ring-coral sm:p-2"
        :aria-label="
          t('album.library.openNamed', { name: t(album.name) })
        "
      >
        <!-- Папка визуально отделяет каталог журналов от содержимого выбранного альбома. -->
        <div
          class="relative mx-auto aspect-[4/3] w-full max-w-56 pt-[9%] transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
        >
          <div class="absolute left-[3%] top-0 h-[20%] w-[42%] rounded-t-lg bg-gold" />
          <div
            class="absolute inset-x-[3%] bottom-0 top-[9%] overflow-hidden rounded-lg rounded-tl-sm border-2 border-ink/20 bg-gold shadow-[5px_6px_0_rgb(var(--color-ink)/0.12)]"
          >
            <LoadableImage
              v-if="getCover(album)"
              class="h-full w-full"
              image-class="opacity-90 transition-transform duration-300 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
              :src="getCover(album)"
              :alt="t(album.name)"
              fit="cover"
            />
          </div>
        </div>

        <div class="mt-3 text-center">
          <strong class="block truncate text-sm font-black sm:text-base">
            {{ t(album.name) }}
          </strong>
          <span class="mt-0.5 block truncate text-[11px] text-ink/50">
            {{ t(album.description) }}
          </span>
          <span v-if="isCollectible(album)" class="mt-1 block text-xs font-bold text-ink/55">
            {{ t('album.library.progress', { progress: getPlacedPercent(album) }) }}
          </span>
          <span
            v-if="isCollectible(album)"
            class="mx-auto mt-2 block h-1.5 w-4/5 overflow-hidden rounded-full bg-ink/10"
          >
            <span
              class="block h-full rounded-full bg-coral transition-[width] duration-300"
              :style="{ width: `${getPlacedPercent(album)}%` }"
            />
          </span>
          <span
            v-if="isCollectible(album)"
            class="mt-1 block text-[10px] font-semibold text-ink/50"
          >
            {{
              t('album.library.collected', {
                collected: getProgress(album).collectedCards,
                total: getProgress(album).totalCards,
              })
            }}
          </span>
          <span v-else class="mt-1 block text-xs font-bold text-ink/55">
            {{ t('album.library.information') }}
          </span>
          <span class="mt-1.5 block text-[11px] font-bold uppercase tracking-wide text-coral">
            {{ t('album.library.pages', { count: album.pages.length }) }}
          </span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
