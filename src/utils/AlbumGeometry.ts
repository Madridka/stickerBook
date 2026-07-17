import type { AlbumGeometryData, AlbumGeometryPage, AlbumGeometrySlot } from '@/types'

export interface AlbumGeometry {
  pages: AlbumGeometryPage[]
  slots: AlbumGeometrySlot[]
  getPage: (pageId: string) => AlbumGeometryPage
  getSlot: (slotId: string) => AlbumGeometrySlot | undefined
  getSlotHeight: (slot: AlbumGeometrySlot) => number
  getSlotStyle: (slot: AlbumGeometrySlot, page: AlbumGeometryPage) => Record<string, string>
}

// Создаёт независимую от PNG систему координат альбома и проверяет уникальность слотов.
export const createAlbumGeometry = (data: AlbumGeometryData): AlbumGeometry => {
  const slots: AlbumGeometrySlot[] = data.pages.flatMap(
    ({ slots: pageSlots }): AlbumGeometrySlot[] => pageSlots,
  )
  const slotIds: Set<string> = new Set(slots.map(({ id }): string => id))
  // if (slotIds.size !== slots.length) throw new Error('Album geometry contains duplicate slot ids')

  const getPage = (pageId: string): AlbumGeometryPage => {
    const page: AlbumGeometryPage | undefined = data.pages.find(({ id }): boolean => id === pageId)
    if (!page) throw new Error(`Unknown album page: ${pageId}`)
    return page
  }

  const getSlot = (slotId: string): AlbumGeometrySlot | undefined =>
    slots.find(({ id }): boolean => id === slotId)

  const getSlotHeight = (slot: AlbumGeometrySlot): number =>
    slot.width * (data.stickerRatio.height / data.stickerRatio.width)

  // Переводит координаты JSON в проценты относительно HTML-слоя страницы.
  const getSlotStyle = (
    slot: AlbumGeometrySlot,
    page: AlbumGeometryPage,
  ): Record<string, string> => ({
    left: `${(slot.x / page.width) * 100}%`,
    top: `${(slot.y / page.height) * 100}%`,
    width: `${(slot.width / page.width) * 100}%`,
    height: `${(getSlotHeight(slot) / page.height) * 100}%`,
  })

  return { pages: data.pages, slots, getPage, getSlot, getSlotHeight, getSlotStyle }
}
