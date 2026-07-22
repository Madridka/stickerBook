import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import gameData from '../src/data/mainConst.json' with { type: 'json' }
import type { CardRarity } from '../src/types/cardCatalog.ts'

interface LegacyWeightedCard {
  weight: number
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(scriptDirectory, '../src/data/wc-26')
const rarities = gameData.cardCatalog.rarities as CardRarity[]

const readLegacyCards = async (): Promise<LegacyWeightedCard[]> => {
  const entries = await readdir(dataDirectory, { withFileTypes: true })
  const cards: LegacyWeightedCard[] = []
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const filePath = path.join(dataDirectory, entry.name, 'players.json')
    const input = JSON.parse(await readFile(filePath, 'utf8')) as LegacyWeightedCard[]
    cards.push(...input)
  }
  return cards
}

const getRarity = (weight: number): CardRarity => {
  const range = [...gameData.legacyMigration.weightToRarity]
    .sort((left, right) => right.minWeight - left.minWeight)
    .find((candidate) => weight >= candidate.minWeight)
  if (!range) throw new Error(`No rarity mapping for legacy weight ${weight}`)
  return range.rarity as CardRarity
}

// Округляет до сотых и компенсирует погрешность в самой крупной категории.
export const calculateLegacyRarityOdds = (
  cards: readonly LegacyWeightedCard[],
): Record<CardRarity, number> => {
  const weightSums = Object.fromEntries(rarities.map((rarity) => [rarity, 0])) as Record<
    CardRarity,
    number
  >
  for (const card of cards) {
    weightSums[getRarity(card.weight)] += card.weight
  }

  const totalWeight = Object.values(weightSums).reduce((total, weight) => total + weight, 0)
  if (totalWeight <= 0) throw new Error('Legacy catalog has no positive weight')

  const odds = Object.fromEntries(
    rarities.map((rarity) => [
      rarity,
      Math.round((weightSums[rarity] / totalWeight) * 10000) / 100,
    ]),
  ) as Record<CardRarity, number>
  const roundedTotal = Object.values(odds).reduce((total, value) => total + value, 0)
  const largestRarity = rarities.reduce((largest, rarity) =>
    weightSums[rarity] > weightSums[largest] ? rarity : largest,
  )
  odds[largestRarity] = Math.round((odds[largestRarity] + 100 - roundedTotal) * 100) / 100
  return odds
}

const main = async (): Promise<void> => {
  const cards = await readLegacyCards()
  console.log(
    JSON.stringify({ cardCount: cards.length, rarityOdds: calculateLegacyRarityOdds(cards) }, null, 2),
  )
}

const isDirectExecution =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectExecution) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
