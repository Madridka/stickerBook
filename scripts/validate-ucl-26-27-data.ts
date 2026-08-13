import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import { parseCardCatalog } from '../src/schemas/cardCatalog.ts'
import type {
  Card,
  CardCatalog,
  CardRarity,
  PlayerPosition,
} from '../src/types/cardCatalog.ts'

interface ManifestClub {
  teamId: string
  code: string
  displayName: string
  countryCode: string
  status: string
}

interface UclManifest {
  schemaVersion: number
  id: string
  snapshotDate: string
  expectedClubCount: number
  cardsPerClub: number
  baseCardCount: number
  clubs: ManifestClub[]
}

const COLLECTION_ID = 'ucl-26-27'
const POOL_ID = 'ucl-26-27-standard'
const EXPECTED_POSITIONS: Readonly<Record<PlayerPosition, number>> = {
  GK: 2,
  DF: 6,
  MF: 5,
  FW: 5,
}
const EXPECTED_RARITIES: Readonly<Record<CardRarity, number>> = {
  common: 7,
  uncommon: 6,
  rare: 4,
  epic: 2,
  legendary: 1,
}
const PLACEHOLDER_PATTERN = /\b(?:player name|todo|tbd|unknown|placeholder|current head coach|example player)\b/i
const PERSON_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(scriptDirectory, '../src/data/ucl-26-27')
const publicDirectory = path.resolve(scriptDirectory, '../public')

const findCatalogs = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return findCatalogs(entryPath)
      return entry.isFile() && entry.name === 'cards.json' ? [entryPath] : []
    }),
  )
  return nested.flat().sort()
}

const formatZodError = (error: ZodError): string =>
  error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join('; ')

const countBy = <T extends string>(values: readonly T[]): Map<T, number> => {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

const validateSequence = <T extends string | number>(
  actual: readonly T[],
  expected: readonly T[],
): boolean => actual.length === expected.length && expected.every((value) => actual.includes(value))

const validateCatalog = (
  catalog: CardCatalog,
  catalogPath: string,
  club: ManifestClub | undefined,
  failures: string[],
): void => {
  const directoryName = path.basename(path.dirname(catalogPath))
  const baseCards = catalog.cards.filter((card) => card.series === 'base')
  const players = baseCards.filter((card) => card.kind === 'player')
  const prefix = `${catalog.teamId}:`

  if (catalog.schemaVersion !== 2) failures.push(`${prefix} schemaVersion must be 2`)
  if (catalog.collectionId !== COLLECTION_ID) failures.push(`${prefix} invalid collectionId`)
  if (catalog.teamId !== directoryName) failures.push(`${prefix} teamId does not match directory`)
  if (!club) failures.push(`${prefix} team is absent from manifest`)
  if (baseCards.length !== 20) failures.push(`${prefix} expected 20 base cards`)
  if (!validateSequence(baseCards.flatMap(({ albumSlot }) => albumSlot ?? []), Array.from({ length: 20 }, (_, index) => index + 1))) {
    failures.push(`${prefix} albumSlot must contain 1..20`)
  }
  if (!validateSequence(baseCards.map(({ cardNumber }) => cardNumber), Array.from({ length: 20 }, (_, index) => String(index + 1).padStart(2, '0')))) {
    failures.push(`${prefix} cardNumber must contain 01..20`)
  }
  if (baseCards.filter(({ kind }) => kind === 'team').length !== 1) failures.push(`${prefix} expected one team card`)
  if (baseCards.filter(({ kind }) => kind === 'coach').length !== 1) failures.push(`${prefix} expected one coach card`)

  const positions = countBy(players.map(({ position }) => position))
  for (const [position, expected] of Object.entries(EXPECTED_POSITIONS) as Array<[PlayerPosition, number]>) {
    if ((positions.get(position) ?? 0) !== expected) failures.push(`${prefix} expected ${expected} ${position} players`)
  }
  const rarities = countBy(baseCards.flatMap(({ rarity }) => rarity ?? []))
  for (const [rarity, expected] of Object.entries(EXPECTED_RARITIES) as Array<[CardRarity, number]>) {
    if ((rarities.get(rarity) ?? 0) !== expected) failures.push(`${prefix} expected ${expected} ${rarity} cards`)
  }

  const personIds = new Set<string>()
  for (const card of catalog.cards) {
    if (PLACEHOLDER_PATTERN.test(card.displayName)) failures.push(`${card.id}: placeholder displayName`)
    if (card.series !== 'base') failures.push(`${card.id}: series must be base`)
    if (card.finish !== 'standard') failures.push(`${card.id}: finish must be standard`)
    if (!card.image.startsWith(`/${COLLECTION_ID}/cards/`) || card.image.includes('..')) failures.push(`${card.id}: invalid image root`)
    if (club && !card.image.startsWith(`/${COLLECTION_ID}/cards/${catalog.teamId}/UCL-${club.code}-${card.cardNumber}-`)) {
      failures.push(`${card.id}: image path does not match teamId, code and cardNumber`)
    }
    const acquisition = card.acquisition ?? catalog.defaults.acquisition
    if (acquisition.some((source) => source.type !== 'pack' || source.poolId !== POOL_ID)) failures.push(`${card.id}: invalid acquisition pool`)
    if (card.kind === 'coach' || card.kind === 'player') {
      if (!PERSON_ID_PATTERN.test(card.personId)) failures.push(`${card.id}: invalid personId`)
      if (personIds.has(card.personId)) failures.push(`${card.id}: duplicate personId in club`)
      personIds.add(card.personId)
    }
    if (card.kind === 'player' && !card.nationality?.trim()) {
      failures.push(`${card.id}: player nationality is required`)
    }
  }
}

const validateData = async (): Promise<void> => {
  const failures: string[] = []
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as UclManifest
  const catalogPaths = await findCatalogs(dataDirectory)
  const clubsByTeamId = new Map(manifest.clubs.map((club) => [club.teamId, club]))
  const catalogs: CardCatalog[] = []

  if (manifest.schemaVersion !== 1) failures.push('manifest: schemaVersion must be 1')
  if (manifest.id !== COLLECTION_ID) failures.push('manifest: invalid id')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.snapshotDate)) failures.push('manifest: invalid snapshotDate')
  if (manifest.clubs.length !== manifest.expectedClubCount) failures.push('manifest: clubs length does not match expectedClubCount')
  if (manifest.baseCardCount !== manifest.expectedClubCount * manifest.cardsPerClub) failures.push('manifest: invalid baseCardCount')
  if (catalogPaths.length !== manifest.expectedClubCount) failures.push(`Expected ${manifest.expectedClubCount} cards.json files, found ${catalogPaths.length}`)

  for (const catalogPath of catalogPaths) {
    try {
      const catalog = parseCardCatalog(JSON.parse(await readFile(catalogPath, 'utf8')) as unknown, manifest.cardsPerClub)
      validateCatalog(catalog, catalogPath, clubsByTeamId.get(catalog.teamId), failures)
      catalogs.push(catalog)
    } catch (error: unknown) {
      const reason = error instanceof ZodError ? formatZodError(error) : String(error)
      failures.push(`${path.relative(dataDirectory, catalogPath)}: ${reason}`)
    }
  }

  const cards: Card[] = catalogs.flatMap(({ cards }) => cards)
  if (cards.length !== manifest.baseCardCount) failures.push(`Expected ${manifest.baseCardCount} cards, found ${cards.length}`)
  const idCounts = countBy(cards.map(({ id }) => id))
  for (const [id, count] of idCounts) if (count > 1) failures.push(`${id}: duplicate global id`)
  for (const card of cards) {
    try {
      const image = await readFile(path.join(publicDirectory, card.image.replace(/^\//, '')))
      const isWebp =
        image.length > 1_000 &&
        image.subarray(0, 4).toString('ascii') === 'RIFF' &&
        image.subarray(8, 12).toString('ascii') === 'WEBP'
      if (!isWebp) failures.push(`${card.id}: image is not a valid WebP asset`)
    } catch {
      failures.push(`${card.id}: image asset is missing`)
    }
  }

  if (failures.length > 0) throw new Error(`UCL catalog validation failed:\n${failures.join('\n')}`)
  console.log(`Validated ${catalogPaths.length} UCL catalogs and ${cards.length} base cards.`)
}

validateData().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
