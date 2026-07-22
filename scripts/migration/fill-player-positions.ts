import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CARD_CATALOG_CONFIG, COLLECTION_CONFIG } from '../../src/data/mainConst.ts'
import { parseCardCatalog } from '../../src/schemas/cardCatalog.ts'
import type { CardCatalog, PlayerPosition } from '../../src/types/cardCatalog.ts'

interface PositionCacheEntry {
  position: PlayerPosition
  source: 'local' | 'external'
  sourceReference: string
  checkedAt: string
}

interface PositionProgress {
  completedTeams: string[]
  processedTeamCount: number
  processedPlayerCardCount: number
  positionsAdded: number
  unresolvedFieldCount: number
  errorCount: number
  startedAt: string
  schemaVersion: number
}

interface UnresolvedPosition {
  teamId: string
  cardId: string
  displayName: string
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '../..')
const dataDirectory = path.join(projectDirectory, 'src/data/wc-26')
const cachePath = path.join(scriptDirectory, 'cache/player-positions.json')
const reportsDirectory = path.join(scriptDirectory, 'reports')
const progressPath = path.join(reportsDirectory, 'player-positions-progress.json')
const unresolvedPath = path.join(reportsDirectory, 'player-positions-unresolved.json')
const positions = new Set<PlayerPosition>(['GK', 'DF', 'MF', 'FW'])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown

const writeJsonAtomically = async (filePath: string, value: unknown): Promise<void> => {
  const temporaryPath = `${filePath}.part`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, filePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

const parseCache = (input: unknown): Record<string, PositionCacheEntry> => {
  if (!isRecord(input)) {
    throw new Error('Player position cache must be an object')
  }

  return Object.fromEntries(
    Object.entries(input).map(([personId, value]) => {
      if (
        !isRecord(value) ||
        !positions.has(value.position as PlayerPosition) ||
        (value.source !== 'local' && value.source !== 'external') ||
        typeof value.sourceReference !== 'string' ||
        value.sourceReference.length === 0 ||
        typeof value.checkedAt !== 'string' ||
        Number.isNaN(Date.parse(value.checkedAt))
      ) {
        throw new Error(`Invalid cache entry: ${personId}`)
      }
      return [personId, value as unknown as PositionCacheEntry]
    }),
  )
}

const findCatalogFiles = async (): Promise<string[]> => {
  const entries = await readdir(dataDirectory, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => path.join(dataDirectory, entry.name, 'cards.json'))
}

const writeCatalog = async (filePath: string, catalog: CardCatalog): Promise<void> => {
  const temporaryPath = path.join(path.dirname(filePath), 'cards.part.json')
  try {
    await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
    parseCardCatalog(await readJson(temporaryPath))
    await rename(temporaryPath, filePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

const assertTeamPositions = (catalog: CardCatalog): void => {
  const playerCards = catalog.cards.filter((card) => card.kind === 'player')
  if (playerCards.some((card) => !positions.has(card.position))) {
    throw new Error(`${catalog.teamId}: player has an invalid position`)
  }
  if (!playerCards.some((card) => card.position === 'GK')) {
    throw new Error(`${catalog.teamId}: team has no goalkeeper`)
  }
  if (
    catalog.cards.some(
      (card) => card.kind !== 'player' && Object.hasOwn(card, 'position'),
    )
  ) {
    throw new Error(`${catalog.teamId}: non-player card has a position`)
  }
}

// Сначала использует командный ключ для одноимённых людей, затем обычный personId.
const getCachedPosition = (
  cache: Record<string, PositionCacheEntry>,
  teamId: string,
  personId: string,
): PlayerPosition | undefined =>
  cache[`${teamId}:${personId}`]?.position ?? cache[personId]?.position

const createProgress = (): PositionProgress => ({
  completedTeams: [],
  processedTeamCount: 0,
  processedPlayerCardCount: 0,
  positionsAdded: 0,
  unresolvedFieldCount: 0,
  errorCount: 0,
  startedAt: new Date().toISOString(),
  schemaVersion: CARD_CATALOG_CONFIG.schemaVersion,
})

const main = async (): Promise<void> => {
  await mkdir(reportsDirectory, { recursive: true })
  const cache = parseCache(await readJson(cachePath))
  const catalogFiles = await findCatalogFiles()
  if (catalogFiles.length !== COLLECTION_CONFIG.expectedTeamCount) {
    throw new Error(
      `Expected ${COLLECTION_CONFIG.expectedTeamCount} catalogs, found ${catalogFiles.length}`,
    )
  }

  const progress = createProgress()
  const unresolved: UnresolvedPosition[] = []

  for (const [index, catalogFile] of catalogFiles.entries()) {
    const input = await readJson(catalogFile)
    if (!isRecord(input) || !Array.isArray(input.cards) || typeof input.teamId !== 'string') {
      throw new Error(`${catalogFile}: invalid catalog shape`)
    }

    const teamId = input.teamId
    let positionsAdded = 0
    const cards = input.cards.map((card) => {
      if (!isRecord(card) || card.kind !== 'player') {
        return card
      }

      progress.processedPlayerCardCount += 1
      if (positions.has(card.position as PlayerPosition)) {
        return card
      }
      const position =
        typeof card.personId === 'string'
          ? getCachedPosition(cache, teamId, card.personId)
          : undefined
      if (!position) {
        unresolved.push({
          teamId,
          cardId: String(card.id),
          displayName: String(card.displayName),
        })
        return card
      }
      positionsAdded += 1
      return { ...card, position }
    })

    try {
      if (unresolved.some((item) => item.teamId === teamId)) {
        throw new Error(`${teamId}: unresolved player positions remain`)
      }
      const catalog = parseCardCatalog({ ...input, cards })
      assertTeamPositions(catalog)
      await writeCatalog(catalogFile, catalog)
      progress.completedTeams.push(teamId)
      progress.processedTeamCount += 1
      progress.positionsAdded += positionsAdded
      console.log(`[${index + 1}/${catalogFiles.length}] ${teamId}: ${positionsAdded} positions added`)
    } catch (error: unknown) {
      progress.errorCount += 1
      console.error(error instanceof Error ? error.message : String(error))
    }

    progress.unresolvedFieldCount = unresolved.length
    await writeJsonAtomically(progressPath, progress)
    await writeJsonAtomically(unresolvedPath, unresolved)
  }

  if (progress.errorCount > 0 || unresolved.length > 0) {
    throw new Error(
      `Position migration failed: ${progress.errorCount} errors, ${unresolved.length} unresolved`,
    )
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
