/** Параметры интерактивной подготовки наклейки перед помещением в журнал. */
export const STICKER_PREPARATION_CONFIG = {
  peel: {
    successQuality: 100,
    initialPositionPercent: 12,
    initialTargetPositionPercent: 70,
    initialTargetDurationMs: 900,
    targetDurationMinMs: 650,
    targetDurationMaxMs: 1_250,
    targetPositionMinPercent: 22,
    targetPositionMaxPercent: 78,
    targetPauseMinMs: 180,
    targetPauseMaxMs: 520,
    resetTargetMinPercent: 38,
    resetTargetMaxPercent: 72,
    startDelayMs: 180,
    handleMinPercent: 7,
    handleMaxPercent: 93,
  },
  alignment: {
    // Карточка 112×168 остаётся целиком внутри поля 256×256 даже на мобильном экране.
    initialX: {
      min: -72,
      max: 72,
    },
    initialY: {
      min: -44,
      max: 44,
    },
    accuracyBase: 101,
    accuracyDistanceDivisor: 2,
    cardWidth: 112,
    cardHeight: 168,
    perfectAccuracy: 95,
    maxX: 128,
    maxY: 144,
  },
  press: {
    minimumQuality: 80,
    mistakePenalty: 5,
    zonePositions: [
      { leftPercent: 8, topPercent: 8 },
      { leftPercent: 72, topPercent: 8 },
      { leftPercent: 72, topPercent: 76 },
      { leftPercent: 8, topPercent: 76 },
    ],
  },
  stepCount: 3,
}

/** Минимальное движение указателя, после которого начинается drag карточки. */
export const STICKER_DRAG_THRESHOLD_PX: number = 10

/** Пороговые значения физики размещения наклейки в журнале. */
export const STICKER_DROP_CONFIG = {
  perfectDistance: 0.16,
  nearDistance: 0.55,
  perfectQuality: 100,
  nearQuality: 85,
  farQuality: 60,
  maximumRotationOffset: 0.45,
  maximumRotationDegrees: 18,
}
