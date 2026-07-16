import type { StickerDropGrade, StickerDropResult } from '@/types'

interface DropCardIdentity {
  instanceId: string
  playerId: string
}

const gradeDrop = (distance: number): { grade: StickerDropGrade; quality: number } => {
  if (distance <= 0.16) return { grade: 'perfect', quality: 100 }
  if (distance <= 0.55) return { grade: 'near', quality: 85 }
  return { grade: 'far', quality: 60 }
}

// Отвечает за поиск ближайшего слота и расстояние от курсора до его центра.
export const evaluateStickerDrop = (
  point: { x: number; y: number },
  card: DropCardIdentity,
): StickerDropResult | undefined => {
  const targets: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-sticker-slot]:not([data-occupied="true"])'),
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
    ...card,
    slotId: nearest.element.dataset.stickerSlot ?? '',
    x: (point.x - nearest.centerX) / nearest.bounds.width,
    y: (point.y - nearest.centerY) / nearest.bounds.height,
    distance: nearest.distance,
    accuracy,
    quality,
    grade,
  }
}
