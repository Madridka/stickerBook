import { computed, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import albumData from '@/data/wc-26/album'
import { createAlbumGeometry, type AlbumGeometry } from '@/utils/AlbumGeometry'
import type { AlbumGeometryData, AlbumGeometryPage, AlbumGeometrySlot } from '@/types'

export const useAlbumStore = defineStore('album', () => {
  const geometry: AlbumGeometry = createAlbumGeometry(albumData as AlbumGeometryData)
  const pages: ComputedRef<AlbumGeometryPage[]> = computed(
    (): AlbumGeometryPage[] => geometry.pages,
  )
  const slots: ComputedRef<AlbumGeometrySlot[]> = computed(
    (): AlbumGeometrySlot[] => geometry.slots,
  )

  return { geometry, pages, slots }
})
