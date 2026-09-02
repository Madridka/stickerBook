import type { AlbumId, CardDefinition, CardRarity, PickCandidateRef } from '@/types'

export interface PickPoolCard {
  albumId: AlbumId
  card: CardDefinition
}

const RARITIES: readonly CardRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const randomIndex = (length: number, randomSource: () => number): number =>
  Math.min(length - 1, Math.floor(randomSource() * length))

const shuffle = <Value>(items: readonly Value[], randomSource: () => number): Value[] => {
  const result: Value[] = [...items]
  for (let index: number = result.length - 1; index > 0; index -= 1) {
    const targetIndex: number = randomIndex(index + 1, randomSource)
    const current: Value = result[index]
    result[index] = result[targetIndex]
    result[targetIndex] = current
  }
  return result
}

const selectWeighted = (
  pool: readonly PickPoolCard[],
  rarityOdds: Readonly<Record<CardRarity, number>>,
  randomSource: () => number,
): PickPoolCard => {
  const availableRarities: CardRarity[] = RARITIES.filter((rarity) =>
    pool.some(({ card }): boolean => card.rarity === rarity),
  )
  const totalOdds: number = availableRarities.reduce(
    (total, rarity): number => total + Math.max(0, rarityOdds[rarity]),
    0,
  )
  let rarityCursor: number = randomSource() * totalOdds
  let selectedRarity: CardRarity = availableRarities[availableRarities.length - 1]
  for (const rarity of availableRarities) {
    rarityCursor -= Math.max(0, rarityOdds[rarity])
    if (rarityCursor < 0) {
      selectedRarity = rarity
      break
    }
  }

  const rarityPool: PickPoolCard[] = pool.filter(
    ({ card }): boolean => card.rarity === selectedRarity,
  )
  const totalWeight: number = rarityPool.reduce(
    (total, { card }): number => total + Math.max(0.0001, card.selectionWeight),
    0,
  )
  let cardCursor: number = randomSource() * totalWeight
  for (const candidate of rarityPool) {
    cardCursor -= Math.max(0.0001, candidate.card.selectionWeight)
    if (cardCursor < 0) return candidate
  }
  return rarityPool[randomIndex(rarityPool.length, randomSource)]
}

const keyOf = ({ albumId, card }: PickPoolCard): string => `${albumId}:${card.id}`

export const isPackCard = ({ card }: PickPoolCard): boolean =>
  card.acquisition.some(({ type }): boolean => type === 'pack')

/** Создаёт уникальную пятёрку с управляемой редкостью и опциональной неповторкой. */
export const createPickCandidates = (
  pool: readonly PickPoolCard[],
  count: number,
  rarityOdds: Readonly<Record<CardRarity, number>>,
  ownedKeys: ReadonlySet<string>,
  guaranteeNew: boolean,
  randomSource: () => number = Math.random,
): PickCandidateRef[] => {
  const remaining: PickPoolCard[] = [...pool]
  const selected: PickPoolCard[] = []

  if (guaranteeNew) {
    const missing: PickPoolCard[] = remaining.filter((candidate) => !ownedKeys.has(keyOf(candidate)))
    if (missing.length > 0) {
      const guaranteed: PickPoolCard = selectWeighted(missing, rarityOdds, randomSource)
      selected.push(guaranteed)
      remaining.splice(remaining.findIndex((candidate) => keyOf(candidate) === keyOf(guaranteed)), 1)
    }
  }

  while (selected.length < count && remaining.length > 0) {
    const candidate: PickPoolCard = selectWeighted(remaining, rarityOdds, randomSource)
    selected.push(candidate)
    remaining.splice(remaining.findIndex((item) => keyOf(item) === keyOf(candidate)), 1)
  }

  return shuffle(selected, randomSource)
    .map(({ albumId, card }): PickCandidateRef => ({ albumId, playerId: card.id }))
}
