import type {
  StickerDropGrade,
  StickerDropResult,
  StickerPlacement,
  StickerPreparation,
} from '@/types'
import { STICKER_DROP_CONFIG, STICKER_PREPARATION_CONFIG } from '@/config/stickerEngineConfig'

interface DropCardIdentity {
  instanceId: string
  playerId: string
  albumSlotId: string
}

const { cardWidth, cardHeight, perfectAccuracy, accuracyDistanceDivisor } =
  STICKER_PREPARATION_CONFIG.alignment

export const getStickerAlignmentAccuracy = (x: number, y: number): number =>
  Math.max(
    0,
    100 -
      Math.round(
        Math.hypot(x * cardWidth, y * cardHeight) / accuracyDistanceDivisor,
      ),
  )

export const shouldSnapStickerAlignment = (x: number, y: number): boolean =>
  getStickerAlignmentAccuracy(x, y) > perfectAccuracy

const gradeDrop = (distance: number): { grade: StickerDropGrade; quality: number } => {
  if (distance <= STICKER_DROP_CONFIG.perfectDistance) {
    return { grade: 'perfect', quality: STICKER_DROP_CONFIG.perfectQuality }
  }
  if (distance <= STICKER_DROP_CONFIG.nearDistance) {
    return { grade: 'near', quality: STICKER_DROP_CONFIG.nearQuality }
  }
  return { grade: 'far', quality: STICKER_DROP_CONFIG.farQuality }
}

// Отвечает за поиск ближайшего слота и расстояние от курсора до его центра.
export const evaluateStickerDrop = (
  point: { x: number; y: number },
  card: DropCardIdentity,
): StickerDropResult | undefined => {
  const targets: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-sticker-slot]'),
  ).filter(
    (element: HTMLElement): boolean =>
      element.dataset.occupied !== 'true' || element.dataset.playerId === card.albumSlotId,
  )
  const nearest = targets
    .map((element: HTMLElement) => {
      const bounds: DOMRect = element.getBoundingClientRect()
      const centerX: number = bounds.left + bounds.width / 2
      const centerY: number = bounds.top + bounds.height / 2
      const distancePx: number = Math.hypot(point.x - centerX, point.y - centerY)
      const radius: number = Math.hypot(bounds.width, bounds.height) / 2
      return { element, bounds, centerX, centerY, distance: distancePx / Math.max(radius, 1) }
    })
    .sort((left, right): number => left.distance - right.distance)[0]

  if (!nearest) return undefined
  const { grade, quality } = gradeDrop(nearest.distance)
  const accuracy: number = Math.max(0, Math.round(100 - nearest.distance * 100))

  return {
    instanceId: card.instanceId,
    playerId: card.playerId,
    slotId: nearest.element.dataset.stickerSlot ?? '',
    x: (point.x - nearest.centerX) / nearest.bounds.width,
    y: (point.y - nearest.centerY) / nearest.bounds.height,
    distance: nearest.distance,
    accuracy,
    quality,
    grade,
  }
}

// Сохраняет точную центровку из подготовки, а ручное смещение применяет только к намеренно далёкому броску.
export const resolveStickerPlacement = (
  drop: StickerDropResult,
  preparation?: StickerPreparation,
): StickerPlacement => {
  const isCoarseMiss: boolean = drop.grade === 'far'
  const preparedX: number = preparation?.alignmentX ?? 0
  const preparedY: number = preparation?.alignmentY ?? 0
  const isPreparedAlignmentPerfect: boolean = shouldSnapStickerAlignment(preparedX, preparedY)
  const alignmentX: number = isPreparedAlignmentPerfect ? 0 : preparedX
  const alignmentY: number = isPreparedAlignmentPerfect ? 0 : preparedY
  const x: number = alignmentX + (isCoarseMiss ? drop.x : 0)
  const y: number = alignmentY + (isCoarseMiss ? drop.y : 0)
  return {
    slotId: drop.slotId,
    x,
    y,
    rotation: isCoarseMiss
      ? Math.round(
          Math.max(
            -STICKER_DROP_CONFIG.maximumRotationOffset,
            Math.min(STICKER_DROP_CONFIG.maximumRotationOffset, drop.x),
          ) * STICKER_DROP_CONFIG.maximumRotationDegrees,
        )
      : 0,
    accuracy: getStickerAlignmentAccuracy(x, y),
  }
}
