import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Card, CardCatalog, CardRarity, PlayerPosition } from '../src/types/cardCatalog.ts'

interface RplClub {
  teamId: string
  code: string
  displayName: string
}

interface RplManifest {
  schemaVersion: number
  id: string
  snapshotDate: string
  expectedClubCount: number
  cardsPerClub: number
  baseCardCount: number
  placeholderAssetCount: number
  clubs: RplClub[]
}

const COLLECTION_ID = 'rpl-26-27'
const POOL_ID = 'rpl-26-27-standard'
const PUBLIC_ASSET_PREFIX = `/russia/${COLLECTION_ID}`
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

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(scriptDirectory, '../src/data/russia')
const cardDirectory = path.resolve(scriptDirectory, '../public/russia/rpl-26-27/cards')

const findFiles = async (directory: string, name?: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return findFiles(entryPath, name)
      return entry.isFile() && (!name || entry.name === name) ? [entryPath] : []
    }),
  )
  return nested.flat().sort()
}

const countBy = <T extends string>(values: readonly T[]): Map<T, number> => {
  const counts = new Map<T, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return counts
}

const isWebp = (image: Buffer): boolean =>
  image.length > 1_000 &&
  image.subarray(0, 4).toString('ascii') === 'RIFF' &&
  image.subarray(8, 12).toString('ascii') === 'WEBP'

const validateCatalog = (
  catalog: CardCatalog,
  catalogPath: string,
  club: RplClub | undefined,
  failures: string[],
): void => {
  const prefix = `${catalog.teamId}:`
  const baseCards = catalog.cards.filter((card) => card.series === 'base')
  const players = baseCards.filter((card) => card.kind === 'player')
  const expectedSlots = Array.from({ length: 20 }, (_value, index) => index + 1)
  const expectedNumbers = expectedSlots.map((slot) => String(slot).padStart(2, '0'))

  if (catalog.schemaVersion !== 2) failures.push(`${prefix} schemaVersion must be 2`)
  if (catalog.collectionId !== COLLECTION_ID) failures.push(`${prefix} invalid collectionId`)
  if (catalog.teamId !== path.basename(path.dirname(catalogPath))) failures.push(`${prefix} teamId does not match directory`)
  if (!club) failures.push(`${prefix} team is absent from manifest`)
  if (baseCards.length !== 20) failures.push(`${prefix} expected 20 base cards`)
  if (!expectedSlots.every((slot) => baseCards.some((card) => card.albumSlot === slot))) failures.push(`${prefix} albumSlot must contain 1..20`)
  if (!expectedNumbers.every((number) => baseCards.some((card) => card.cardNumber === number))) failures.push(`${prefix} cardNumber must contain 01..20`)
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

  for (const card of catalog.cards) {
    if (!card.image.startsWith(`${PUBLIC_ASSET_PREFIX}/cards/${catalog.teamId}/`) || card.image.includes('..')) failures.push(`${card.id}: invalid image directory`)
    if (club && !card.image.startsWith(`${PUBLIC_ASSET_PREFIX}/cards/${catalog.teamId}/RPL-${club.code}-${card.cardNumber}-`)) failures.push(`${card.id}: image path does not match club code and card number`)
    const acquisition = card.acquisition ?? catalog.defaults.acquisition
    if (acquisition.some((source) => source.type !== 'pack' || source.poolId !== POOL_ID)) failures.push(`${card.id}: invalid acquisition pool`)
  }
}

const validateData = async (): Promise<void> => {
  const failures: string[] = []
  const manifest = JSON.parse(await readFile(path.join(dataDirectory, 'manifest.json'), 'utf8')) as RplManifest
  const catalogPaths = await findFiles(path.join(dataDirectory, 'RPL'), 'cards.json')
  const clubsByTeamId = new Map(manifest.clubs.map((club) => [club.teamId, club]))
  const catalogs: CardCatalog[] = []

  if (manifest.schemaVersion !== 1) failures.push('manifest: schemaVersion must be 1')
  if (manifest.id !== COLLECTION_ID) failures.push('manifest: invalid id')
  if (manifest.clubs.length !== manifest.expectedClubCount) failures.push('manifest: club count mismatch')
  if (manifest.baseCardCount !== manifest.expectedClubCount * manifest.cardsPerClub) failures.push('manifest: base card count mismatch')
  if (catalogPaths.length !== manifest.expectedClubCount) failures.push(`Expected ${manifest.expectedClubCount} catalogs, found ${catalogPaths.length}`)

  for (const catalogPath of catalogPaths) {
    try {
      const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as CardCatalog
      if (!Array.isArray(catalog.cards) || !catalog.defaults) throw new Error('invalid catalog shape')
      validateCatalog(catalog, catalogPath, clubsByTeamId.get(catalog.teamId), failures)
      catalogs.push(catalog)
    } catch (error: unknown) {
      failures.push(`${path.relative(dataDirectory, catalogPath)}: ${String(error)}`)
    }
  }

  const cards: Card[] = catalogs.flatMap(({ cards }) => cards)
  if (cards.length !== manifest.baseCardCount) failures.push(`Expected ${manifest.baseCardCount} cards, found ${cards.length}`)
  if (new Set(cards.map(({ id }) => id)).size !== cards.length) failures.push('Card ids must be globally unique')
  if (new Set(cards.map(({ image }) => image)).size !== cards.length) failures.push('Card image paths must be globally unique')

  const placeholderPaths = (await findFiles(cardDirectory)).filter((file) => file.endsWith('.webp'))
  if (placeholderPaths.length !== manifest.placeholderAssetCount) failures.push(`Expected ${manifest.placeholderAssetCount} placeholder WebP files, found ${placeholderPaths.length}`)
  const placeholderHashes = new Set<string>()
  for (const placeholderPath of placeholderPaths) {
    const image = await readFile(placeholderPath)
    if (!isWebp(image)) failures.push(`${path.relative(cardDirectory, placeholderPath)}: invalid WebP`)
    placeholderHashes.add(createHash('sha256').update(image).digest('hex'))
  }
  if (placeholderHashes.size !== 1) failures.push('Temporary RPL card images must be byte-identical')

  for (const card of cards) {
    const imagePath = path.resolve(scriptDirectory, '../public', card.image.replace(/^\//, ''))
    try {
      if (!isWebp(await readFile(imagePath))) failures.push(`${card.id}: invalid WebP asset`)
    } catch {
      failures.push(`${card.id}: image asset is missing`)
    }
  }

  if (failures.length > 0) throw new Error(`RPL catalog validation failed:\n${failures.join('\n')}`)
  console.log(`Validated ${catalogs.length} RPL catalogs, ${cards.length} cards and ${placeholderPaths.length} identical placeholder assets.`)
}

validateData().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
