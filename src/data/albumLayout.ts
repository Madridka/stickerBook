import type { AlbumGeometryPage, AlbumGeometrySlot } from '@/types'

const PAGE_WIDTH: number = 390
const PAGE_HEIGHT: number = 844
const SLOT_WIDTH: number = 58
const STICKER_ASPECT_RATIO = { width: 2, height: 3 }

// Создаёт одинаковую сетку из десяти слотов для каждой страницы альбома.
const createStickerSlots = (startNumber: number): AlbumGeometrySlot[] => {
  const rowY: number[] = [142, 275, 408]
  const fourColumnX: number[] = [30, 111, 192, 273]
  const twoColumnX: number[] = [111, 192]
  const positions: Array<{ x: number; y: number }> = [
    ...twoColumnX.map((x: number): { x: number; y: number } => ({ x, y: rowY[0] })),
    ...rowY.slice(1).flatMap((y: number): Array<{ x: number; y: number }> =>
      fourColumnX.map((x: number): { x: number; y: number } => ({ x, y })),
    ),
  ]

  return positions.map(({ x, y }, index: number): AlbumGeometrySlot => ({
    id: `mex-${String(startNumber + index).padStart(2, '0')}-slot`,
    playerId: `mex-${String(startNumber + index).padStart(2, '0')}`,
    name: `mex-${String(startNumber + index).padStart(2, '0')}`,
    x,
    y,
    width: SLOT_WIDTH,
  }))
}

const emptySlots = (id: string): AlbumGeometryPage => ({
  id,
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
  slots: [],
})

export const albumLayout = {
  version: 1,
  stickerAspectRatio: STICKER_ASPECT_RATIO,
  pages: [
    { ...emptySlots('stickers-left'), slots: createStickerSlots(1) },
    { ...emptySlots('stickers-right'), slots: createStickerSlots(11) },
  ] satisfies AlbumGeometryPage[],
}
