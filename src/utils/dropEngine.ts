import type { Card, CardCatalog, CardRarity } from '../types/cardCatalog.ts'

export type RandomSource = () => number
export type RarityOdds = Record<CardRarity, number>

export interface PackDropConfig {
  cardsPerPack: number
  rarityOdds: RarityOdds
}

export interface DropEngineV2Options {
  catalogs: readonly CardCatalog[]
  packConfig: PackDropConfig
  poolId: string
  defaultSelectionWeight: number
  randomSource: RandomSource
}

interface DropCandidate {
  card: Card
  rarity: CardRarity
  selectionWeight: number
}

const rarityOrder: CardRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const getRandomUnit = (randomSource: RandomSource): number => {
  const value = randomSource()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new Error('Random source must return a finite value in the [0, 1) range')
  }
  return value
}

const selectWeighted = <T>(
  values: readonly T[],
  getWeight: (value: T) => number,
  randomSource: RandomSource,
): T => {
  const totalWeight = values.reduce((total, value) => total + getWeight(value), 0)
  if (values.length === 0 || !Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new Error('Weighted pool must contain a positive total weight')
  }

  let cursor = getRandomUnit(randomSource) * totalWeight
  for (const value of values) {
    cursor -= getWeight(value)
    if (cursor < 0) return value
  }

  return values[values.length - 1] as T
}

const isAvailableFromPack = (catalog: CardCatalog, card: Card, poolId: string): boolean =>
  (card.acquisition ?? catalog.defaults.acquisition).some(
    (source) => source.type === 'pack' && source.poolId === poolId,
  )

const collectCandidates = (
  catalogs: readonly CardCatalog[],
  poolId: string,
  defaultSelectionWeight: number,
): DropCandidate[] => {
  if (!Number.isFinite(defaultSelectionWeight) || defaultSelectionWeight <= 0) {
    throw new Error('Default selection weight must be positive')
  }

  return catalogs.flatMap((catalog) =>
    catalog.cards
      .filter((card) => isAvailableFromPack(catalog, card, poolId))
      .map((card) => ({
        card,
        rarity: card.rarity ?? catalog.defaults.rarity,
        selectionWeight: card.selectionWeight ?? defaultSelectionWeight,
      })),
  )
}

// Исключает пустые группы и пересчитывает их вероятности в точную сумму 100.
export const getRenormalizedRarityOdds = (
  rarityOdds: RarityOdds,
  availableRarities: ReadonlySet<CardRarity>,
): Partial<RarityOdds> => {
  const available = rarityOrder.filter((rarity) => availableRarities.has(rarity))
  const totalOdds = available.reduce((total, rarity) => total + rarityOdds[rarity], 0)
  if (!Number.isFinite(totalOdds) || totalOdds <= 0) {
    throw new Error('Available rarity pools must have a positive total probability')
  }

  return Object.fromEntries(
    available.map((rarity) => [rarity, (rarityOdds[rarity] / totalOdds) * 100]),
  ) as Partial<RarityOdds>
}

// Сначала выбирает непустую редкость, затем карточку только внутри выбранной группы.
export const selectCardV2 = (options: DropEngineV2Options): Card => {
  const candidates = collectCandidates(
    options.catalogs,
    options.poolId,
    options.defaultSelectionWeight,
  )
  if (candidates.length === 0) {
    throw new Error(`Pack pool is empty: ${options.poolId}`)
  }

  const candidatesByRarity = new Map<CardRarity, DropCandidate[]>()
  for (const candidate of candidates) {
    candidatesByRarity.set(candidate.rarity, [
      ...(candidatesByRarity.get(candidate.rarity) ?? []),
      candidate,
    ])
  }

  const normalizedOdds = getRenormalizedRarityOdds(
    options.packConfig.rarityOdds,
    new Set(candidatesByRarity.keys()),
  )
  const availableRarities = rarityOrder.filter(
    (rarity) => (normalizedOdds[rarity] ?? 0) > 0,
  )
  const selectedRarity = selectWeighted(
    availableRarities,
    (rarity) => normalizedOdds[rarity] ?? 0,
    options.randomSource,
  )
  const selectedPool = candidatesByRarity.get(selectedRarity) ?? []
  return selectWeighted(
    selectedPool,
    (candidate) => candidate.selectionWeight,
    options.randomSource,
  ).card
}
