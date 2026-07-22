import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import gameData from '../src/data/mainConst.json' with { type: 'json' }
import { parseCardCatalog } from '../src/schemas/cardCatalog.ts'
import type { CardCatalog } from '../src/types/cardCatalog.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(scriptDirectory, '../src/data/wc-26')

// Находит будущие каталоги автоматически, не фиксируя список сборных в коде.
const findCatalogs = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedCatalogs = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return findCatalogs(entryPath)
      }

      return entry.isFile() && entry.name === 'cards.json' ? [entryPath] : []
    }),
  )

  return nestedCatalogs.flat().sort()
}

const formatZodError = (error: ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')

const validateData = async (): Promise<void> => {
  const catalogPaths = await findCatalogs(dataDirectory)
  const failures: string[] = []
  const catalogs: CardCatalog[] = []

  if (catalogPaths.length !== gameData.collection.expectedTeamCount) {
    failures.push(
      `Expected ${gameData.collection.expectedTeamCount} cards.json files, found ${catalogPaths.length}`,
    )
  }

  // Собирает все ошибки, чтобы одна команда давала полный отчёт по каталогам.
  for (const catalogPath of catalogPaths) {
    try {
      const source = await readFile(catalogPath, 'utf8')
      const catalog = parseCardCatalog(JSON.parse(source) as unknown)
      if (catalog.teamId !== path.basename(path.dirname(catalogPath))) {
        failures.push(`${catalog.teamId}: teamId does not match its directory`)
      }
      catalogs.push(catalog)
    } catch (error: unknown) {
      const reason = error instanceof ZodError ? formatZodError(error) : String(error)
      failures.push(`${path.relative(dataDirectory, catalogPath)}: ${reason}`)
    }
  }

  const cardOwners = new Map<string, string[]>()
  const configuredPackPoolIds = new Set(Object.keys(gameData.packConfigs))
  let baseCardCount = 0
  let totalCardCount = 0

  for (const catalog of catalogs) {
    const baseCards = catalog.cards.filter((card) => card.series === 'base')
    const teamCards = baseCards.filter((card) => card.kind === 'team')
    const coachCards = baseCards.filter((card) => card.kind === 'coach')
    const goalkeepers = baseCards.filter(
      (card) => card.kind === 'player' && card.position === 'GK',
    )

    baseCardCount += baseCards.length
    totalCardCount += catalog.cards.length
    if (teamCards.length !== 1) failures.push(`${catalog.teamId}: expected one base team card`)
    if (coachCards.length !== 1) failures.push(`${catalog.teamId}: expected one base coach card`)
    if (goalkeepers.length === 0) failures.push(`${catalog.teamId}: expected at least one base GK`)

    for (const card of catalog.cards) {
      cardOwners.set(card.id, [...(cardOwners.get(card.id) ?? []), catalog.teamId])

      const acquisition = card.acquisition ?? catalog.defaults.acquisition
      for (const source of acquisition) {
        if (source.type === 'pack' && !configuredPackPoolIds.has(source.poolId)) {
          failures.push(`${card.id}: unknown pack pool ${source.poolId}`)
        }
      }

      if (!card.image.startsWith('/cards/') || card.image.includes('..')) {
        failures.push(`${card.id}: invalid card image path ${card.image}`)
      }
    }
  }

  const expectedBaseCardCount =
    gameData.collection.expectedTeamCount * gameData.collection.baseAlbumSlotsPerTeam
  if (baseCardCount !== expectedBaseCardCount) {
    failures.push(`Expected ${expectedBaseCardCount} base cards, found ${baseCardCount}`)
  }
  if (totalCardCount < expectedBaseCardCount) {
    failures.push(`Expected at least ${expectedBaseCardCount} total cards, found ${totalCardCount}`)
  }

  for (const [poolId, packConfig] of Object.entries(gameData.packConfigs)) {
    const oddsTotal = Object.values(packConfig.rarityOdds).reduce(
      (total, odds) => total + odds,
      0,
    )
    if (Math.abs(oddsTotal - 100) > Number.EPSILON * 100) {
      failures.push(`${poolId}: rarity odds total ${oddsTotal}, expected 100`)
    }
  }

  for (const [cardId, teamIds] of cardOwners) {
    if (teamIds.length > 1) {
      failures.push(`${cardId}: duplicate global id in ${teamIds.join(', ')}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(`Card catalog validation failed:\n${failures.join('\n')}`)
  }

  console.log(
    `Validated ${catalogPaths.length} cards.json file(s), ${baseCardCount} base cards and ${totalCardCount} total cards.`,
  )
}

validateData().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
