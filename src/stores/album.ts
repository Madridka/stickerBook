import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { getAlbumById, requireAlbum } from '@/data/albumRegistry'
import { BLISTER_CONFIGS } from '@/config/gameBalance'
import { createAlbumGeometry, type AlbumGeometry } from '@/utils/AlbumGeometry'
import type {
  AlbumDefinition,
  AlbumGeometryPage,
  AlbumGeometrySlot,
  AlbumId,
} from '@/types'

const geometryCache: Map<AlbumId, AlbumGeometry> = new Map()

const getGeometry = (albumId: AlbumId): AlbumGeometry => {
  const cached: AlbumGeometry | undefined = geometryCache.get(albumId)
  if (cached) return cached
  const geometry: AlbumGeometry = createAlbumGeometry(requireAlbum(albumId).geometry)
  geometryCache.set(albumId, geometry)
  return geometry
}

export const useAlbumStore = defineStore('album', () => {
  const currentAlbumId: Ref<AlbumId> = ref(BLISTER_CONFIGS.standard.albumId)
  const definition: ComputedRef<AlbumDefinition> = computed(() =>
    requireAlbum(currentAlbumId.value),
  )
  const geometry: ComputedRef<AlbumGeometry> = computed(() =>
    getGeometry(currentAlbumId.value),
  )
  const pages: ComputedRef<AlbumGeometryPage[]> = computed(() => geometry.value.pages)
  const slots: ComputedRef<AlbumGeometrySlot[]> = computed(() => geometry.value.slots)

  // Переключает общий runtime-контекст только на зарегистрированный журнал.
  const selectAlbum = (albumId: AlbumId): boolean => {
    if (!getAlbumById(albumId)) return false
    currentAlbumId.value = albumId
    return true
  }

  return { currentAlbumId, definition, geometry, pages, slots, selectAlbum }
})
