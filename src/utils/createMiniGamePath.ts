export interface MiniGamePoint {
  x: number
  y: number
}

export interface MiniGamePathConfig {
  pointCountMin: number
  pointCountMax: number
  xMinPercent: number
  xMaxPercent: number
  yMinPercent: number
  yMaxPercent: number
  startYMinPercent: number
  startYMaxPercent: number
  endYMinPercent: number
  endYMaxPercent: number
  minimumSegmentLengthPercent: number
  minimumPointSpacingPercent: number
  minimumHorizontalChangePercent: number
  candidateAttempts: number
}

const randomBetween = (minimum: number, maximum: number): number =>
  minimum + Math.random() * (maximum - minimum)

const createCandidate = (
  config: MiniGamePathConfig,
  yMinimum: number,
  yMaximum: number,
): MiniGamePoint => ({
  x: Math.round(randomBetween(config.xMinPercent, config.xMaxPercent)),
  y: Math.round(randomBetween(yMinimum, yMaximum)),
})

const distanceBetween = (first: MiniGamePoint, second: MiniGamePoint): number =>
  Math.hypot(first.x - second.x, first.y - second.y)

// Выбирает случайную точку с заметным изменением направления и сохраняет лучший запасной вариант.
const selectNextPoint = (
  config: MiniGamePathConfig,
  points: MiniGamePoint[],
  yMinimum: number,
  yMaximum: number,
): MiniGamePoint => {
  const previous: MiniGamePoint = points[points.length - 1]!
  let bestCandidate: MiniGamePoint = createCandidate(config, yMinimum, yMaximum)
  let bestScore: number = -1

  for (let attempt: number = 0; attempt < config.candidateAttempts; attempt += 1) {
    const candidate: MiniGamePoint = createCandidate(config, yMinimum, yMaximum)
    const segmentLength: number = distanceBetween(previous, candidate)
    const pointSpacing: number = Math.min(
      ...points.map((point: MiniGamePoint): number => distanceBetween(point, candidate)),
    )
    const horizontalChange: number = Math.abs(previous.x - candidate.x)
    const score: number = segmentLength + pointSpacing + horizontalChange

    if (score > bestScore) {
      bestCandidate = candidate
      bestScore = score
    }

    if (
      segmentLength >= config.minimumSegmentLengthPercent &&
      pointSpacing >= config.minimumPointSpacingPercent &&
      horizontalChange >= config.minimumHorizontalChangePercent
    ) {
      return candidate
    }
  }

  return bestCandidate
}

// Создаёт новый маршрут на каждый запуск: меняются количество, расположение и изгибы пути.
export const createMiniGamePath = (config: MiniGamePathConfig): MiniGamePoint[] => {
  const pointCount: number = Math.floor(
    randomBetween(config.pointCountMin, config.pointCountMax + 1),
  )
  const points: MiniGamePoint[] = [
    createCandidate(config, config.startYMinPercent, config.startYMaxPercent),
  ]

  while (points.length < pointCount - 1) {
    points.push(selectNextPoint(config, points, config.yMinPercent, config.yMaxPercent))
  }

  points.push(
    selectNextPoint(config, points, config.endYMinPercent, config.endYMaxPercent),
  )
  return points
}
