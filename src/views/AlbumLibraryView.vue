<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import albumCatalog from '@/data/albums.json'
import { useCollectionStore } from '@/stores/collection'
import type { AlbumGeometryData, CollectionItem } from '@/types'

interface AlbumLibraryItem {
  id: string
  route: string
  cover: string
  pages: number
}

const { t } = useI18n()
const collection = useCollectionStore()
const albums: AlbumLibraryItem[] = albumCatalog.albums
const coverImages: Record<string, string> = import.meta.glob(
  '../../assets/game/*/main/album/cover.webp',
  { eager: true, import: 'default', query: '?url' },
) as Record<string, string>
const albumGeometry: Record<string, AlbumGeometryData> = import.meta.glob('../data/*/album.ts', {
  eager: true,
  import: 'default',
}) as Record<string, AlbumGeometryData>

const getCover = (album: AlbumLibraryItem): string =>
  coverImages[`../../assets/game/${album.id}/main/album/${album.cover}`] ?? ''

// Рассчитывает заполнение конкретного журнала только по вклеенным в него карточкам.
const getProgress = (album: AlbumLibraryItem): number => {
  const geometry: AlbumGeometryData | undefined = albumGeometry[`../data/${album.id}/album.ts`]
  if (!geometry) return 0
  const slotIds: Set<string> = new Set(
    geometry.pages.flatMap(({ slots }): string[] => slots.map(({ id }): string => id)),
  )
  if (!slotIds.size) return 0
  const occupiedSlots: Set<string> = new Set(
    collection.items
      .filter(({ instance }: CollectionItem): boolean => instance.location === 'album')
      .map(({ instance }: CollectionItem): string =>
        (instance.placement?.slotId ?? '').replace(/-slot$/, ''),
      )
      .filter((slotId: string): boolean => slotIds.has(slotId)),
  )
  return Math.min(100, Math.round((occupiedSlots.size / slotIds.size) * 100))
}
</script>

<template>
  <!-- Каталог оставляет свободное рабочее пространство для будущих журналов. -->
  <section class="flex h-full min-h-0 w-full flex-col bg-paper">
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
          t('album.library.openNamed', { name: t(`album.library.items.${album.id}.title`) })
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
            <img
              v-if="getCover(album)"
              class="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
              :src="getCover(album)"
              :alt="t(`album.library.items.${album.id}.title`)"
            />
          </div>
        </div>

        <div class="mt-3 text-center">
          <strong class="block truncate text-sm font-black sm:text-base">
            {{ t(`album.library.items.${album.id}.title`) }}
          </strong>
          <span class="mt-1 block text-xs font-bold text-ink/55">
            {{ t('album.library.progress', { progress: getProgress(album) }) }}
          </span>
          <span class="mx-auto mt-2 block h-1.5 w-4/5 overflow-hidden rounded-full bg-ink/10">
            <span
              class="block h-full rounded-full bg-coral transition-[width] duration-300"
              :style="{ width: `${getProgress(album)}%` }"
            />
          </span>
          <span class="mt-1.5 block text-[11px] font-bold uppercase tracking-wide text-coral">
            {{ t('album.library.pages', { count: album.pages }) }}
          </span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
