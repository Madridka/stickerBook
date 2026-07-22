import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CARD_CATALOG_CONFIG,
  COLLECTION_CONFIG,
  LEGACY_MIGRATION_CONFIG,
} from '../../src/data/mainConst.ts'
import { parseCardCatalog } from '../../src/schemas/cardCatalog.ts'
import type {
  CardCatalog,
  CardFinish,
  CardRarity,
  CardSeries,
  PlayerPosition,
} from '../../src/types/cardCatalog.ts'
import cardOverridesInput from './config/card-overrides.json' with { type: 'json' }
import playerPositionCacheInput from './cache/player-positions.json' with { type: 'json' }

interface CliOptions {
  mode: 'dry-run' | 'write'
  teamId?: string
  resume: boolean
}

export interface LegacyCard {
  id: string
  fullName: string
  image: string
  type: string
  team: string
  weight: number
  position?: string
  personId?: string
  shirtNumber?: number
}

interface CardOverride {
  cardNumber?: string
  series?: CardSeries
  finish?: CardFinish
  baseCardId?: string
}

interface PlayerPositionCacheEntry {
  position: PlayerPosition
}

interface LegacyIdentity {
  cardNumber: string
  albumSlot?: number
  series: CardSeries
  finish: CardFinish
  baseCardId?: string
  inferredSpecial: boolean
}

interface DraftCard {
  id: string
  cardNumber: string
  albumSlot?: number
  kind: 'team' | 'coach' | 'player'
  displayName: string
  image: string
  series: CardSeries
  finish: CardFinish
  baseCardId?: string
  personId?: string
  role?: 'HEAD_COACH'
  position?: PlayerPosition
  shirtNumber?: number
  rarity?: CardRarity
}

interface DraftCatalog extends Omit<CardCatalog, 'cards'> {
  cards: DraftCard[]
}

interface LightweightIssue {
  teamId: string
  id?: string
  relatedId?: string
  value?: string | number
  reason?: string
}

interface DuplicateIdIssue {
  id: string
  teamIds: string[]
}

interface DuplicateValueIssue {
  teamId: string
  value: string | number
  ids: string[]
}

interface TeamWithExtraCards {
  teamId: string
  totalCardCount: number
  extraCardCount: number
}

interface TeamProblem {
  teamId: string
  totalCards: number
  baseCards: number
  additionalCards: number
  missingPositions: number
  warningCount: number
  criticalErrorCount: number
}

interface DryRunReport {
  schemaVersion: number
  collectionId: string
  completed: boolean
  teamCount: number
  totalCardCount: number
  teamCardCount: number
  coachCardCount: number
  playerCardCount: number
  baseCardCount: number
  specialCardCount: number
  momentCardCount: number
  legendCardCount: number
  missingPositionCount: number
  teamsWithExtraCards: TeamWithExtraCards[]
  duplicateIds: DuplicateIdIssue[]
  duplicateCardNumbers: DuplicateValueIssue[]
  duplicateAlbumSlots: DuplicateValueIssue[]
  invalidTeamCardCount: LightweightIssue[]
  invalidBaseCardCount: LightweightIssue[]
  missingBaseSlots: LightweightIssue[]
  invalidBaseCardReferences: LightweightIssue[]
  inferredSpecialCards: LightweightIssue[]
  inheritanceWarnings: LightweightIssue[]
  blockingInheritanceMismatches: LightweightIssue[]
  unknownKinds: LightweightIssue[]
  unknownSeries: LightweightIssue[]
  unknownFinishes: LightweightIssue[]
  nonStandardWeights: LightweightIssue[]
  pathErrors: LightweightIssue[]
  teamProblems: TeamProblem[]
}

interface MigrationProgress {
  completedTeams: string[]
  migratedTeamCount: number
  skippedTeamCount: number
  processedCards: number
  errorCount: number
  unresolvedFieldCount: number
  startedAt: string
  schemaVersion: number
}

export interface TeamMigrationResult {
  catalog: DraftCatalog
  missingPositionCount: number
  duplicateCardNumbers: DuplicateValueIssue[]
  duplicateAlbumSlots: DuplicateValueIssue[]
  invalidTeamCardCount: LightweightIssue[]
  invalidBaseCardCount: LightweightIssue[]
  missingBaseSlots: LightweightIssue[]
  invalidBaseCardReferences: LightweightIssue[]
  inferredSpecialCards: LightweightIssue[]
  inheritanceWarnings: LightweightIssue[]
  blockingInheritanceMismatches: LightweightIssue[]
  unknownKinds: LightweightIssue[]
  unknownSeries: LightweightIssue[]
  unknownFinishes: LightweightIssue[]
  nonStandardWeights: LightweightIssue[]
  pathErrors: LightweightIssue[]
}

const cardOverrides = cardOverridesInput as Record<string, CardOverride>
const playerPositionCache = playerPositionCacheInput as Record<string, PlayerPositionCacheEntry>
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '../..')
const dataDirectory = path.join(projectDirectory, 'src/data/wc-26')
const reportsDirectory = path.join(scriptDirectory, 'reports')
const dryRunReportPath = path.join(reportsDirectory, 'cards-v2-dry-run.json')
const progressPath = path.join(reportsDirectory, 'cards-v2-progress.json')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseOptions = (argumentsList: string[]): CliOptions => {
  const supportedArguments = new Set(['--dry-run', '--write', '--resume'])
  const unknownArgument = argumentsList.find(
    (argument) => !supportedArguments.has(argument) && !argument.startsWith('--team='),
  )
  if (unknownArgument) {
    throw new Error(`Unknown argument: ${unknownArgument}`)
  }

  const dryRun = argumentsList.includes('--dry-run')
  const write = argumentsList.includes('--write')
  if (dryRun === write) {
    throw new Error('Choose exactly one mode: --dry-run or --write')
  }

  const teamArguments = argumentsList.filter((argument) => argument.startsWith('--team='))
  if (teamArguments.length > 1) {
    throw new Error('Use --team only once')
  }
  const teamId = teamArguments[0]?.slice('--team='.length)
  if (teamArguments.length === 1 && !teamId) {
    throw new Error('--team requires a non-empty team id')
  }

  const resume = argumentsList.includes('--resume')
  if (resume && !write) {
    throw new Error('--resume is available only together with --write')
  }

  return { mode: dryRun ? 'dry-run' : 'write', teamId, resume }
}

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown

const writeJsonAtomically = async (filePath: string, value: unknown): Promise<void> => {
  const temporaryPath = `${filePath}.part`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filePath)
}

// Ищет составы динамически и сохраняет стабильный порядок обработки сборных.
const findPlayerFiles = async (): Promise<string[]> => {
  const entries = await readdir(dataDirectory, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) {
      continue
    }
    const candidate = path.join(dataDirectory, entry.name, 'players.json')
    try {
      await readFile(candidate, 'utf8')
      files.push(candidate)
    } catch {
      // Директории без players.json не считаются сборными каталога.
    }
  }
  return files
}

const parseLegacyCards = async (filePath: string): Promise<LegacyCard[]> => {
  const input = await readJson(filePath)
  if (!Array.isArray(input)) {
    throw new Error('players.json must contain an array')
  }

  return input.map((item, index): LegacyCard => {
    if (!isRecord(item)) {
      throw new Error(`Card at index ${index} must be an object`)
    }
    const requiredStrings = ['id', 'fullName', 'image', 'type', 'team'] as const
    for (const field of requiredStrings) {
      if (typeof item[field] !== 'string' || item[field].trim() === '') {
        throw new Error(`Card at index ${index} has invalid ${field}`)
      }
    }
    if (typeof item.weight !== 'number' || !Number.isFinite(item.weight)) {
      throw new Error(`Card at index ${index} has invalid weight`)
    }
    return item as unknown as LegacyCard
  })
}

const createPersonId = (displayName: string): string =>
  displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const parseLegacyIdentity = (id: string): LegacyIdentity | null => {
  const match = id.match(/^(.+)-(\d+)(?:\.(\d+))?$/)
  if (!match) {
    return null
  }

  const [, prefix, baseNumber, additionalNumber] = match
  const inferredSpecial = additionalNumber !== undefined
  return {
    cardNumber: inferredSpecial ? `${baseNumber}.${additionalNumber}` : baseNumber,
    albumSlot: inferredSpecial ? undefined : Number.parseInt(baseNumber, 10),
    series: inferredSpecial ? 'special' : 'base',
    finish: 'standard',
    baseCardId: inferredSpecial ? `${prefix}-${baseNumber}` : undefined,
    inferredSpecial,
  }
}

const normalizePosition = (position: string | undefined): PlayerPosition | undefined => {
  const normalized = position?.trim().toUpperCase()
  const positions: Record<string, PlayerPosition> = {
    GK: 'GK',
    GOALKEEPER: 'GK',
    DF: 'DF',
    DEFENDER: 'DF',
    MF: 'MF',
    MIDFIELDER: 'MF',
    FW: 'FW',
    FORWARD: 'FW',
  }
  return normalized ? positions[normalized] : undefined
}

const getCachedPosition = (teamId: string, personId: string): PlayerPosition | undefined =>
  playerPositionCache[`${teamId}:${personId}`]?.position ??
  playerPositionCache[personId]?.position

const getRarity = (weight: number): CardRarity | null => {
  const ranges = [...LEGACY_MIGRATION_CONFIG.weightToRarity].sort(
    (left, right) => right.minWeight - left.minWeight,
  )
  const range = ranges.find((candidate) => weight >= candidate.minWeight)
  return range ? (range.rarity as CardRarity) : null
}

const isStandardWeight = (weight: number): boolean => {
  const ranges = [...LEGACY_MIGRATION_CONFIG.weightToRarity].sort(
    (left, right) => right.minWeight - left.minWeight,
  )
  const exactThreshold = ranges.some((range) => range.minWeight === weight)
  const lowestRange = ranges[ranges.length - 1]
  const nextRange = ranges[ranges.length - 2]
  return (
    exactThreshold ||
    Boolean(
      lowestRange && nextRange && weight >= lowestRange.minWeight && weight < nextRange.minWeight,
    )
  )
}

const isLogicalCardPath = (teamId: string, imagePath: string): boolean => {
  const prefix = `/cards/${teamId}/`
  return (
    imagePath.startsWith(prefix) && !imagePath.includes('..') && imagePath.length > prefix.length
  )
}

const mapKind = (legacyType: string): DraftCard['kind'] | null => {
  const kinds: Record<string, DraftCard['kind']> = {
    logo: 'team',
    'head coach': 'coach',
    coach: 'coach',
    player: 'player',
  }
  return kinds[legacyType.trim().toLowerCase()] ?? null
}

const groupDuplicates = (
  teamId: string,
  cards: DraftCard[],
  getValue: (card: DraftCard) => string | number | undefined,
): DuplicateValueIssue[] => {
  const groups = new Map<string | number, string[]>()
  for (const card of cards) {
    const value = getValue(card)
    if (value !== undefined) {
      groups.set(value, [...(groups.get(value) ?? []), card.id])
    }
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ teamId, value, ids }))
}

// Преобразует legacy-карточки, затем применяет внешние overrides и проверяет связи версий.
export const migrateTeam = (teamId: string, legacyCards: LegacyCard[]): TeamMigrationResult => {
  const cards: DraftCard[] = []
  const inferredSpecialCards: LightweightIssue[] = []
  const inheritanceWarnings: LightweightIssue[] = []
  const blockingInheritanceMismatches: LightweightIssue[] = []
  const unknownKinds: LightweightIssue[] = []
  const unknownSeries: LightweightIssue[] = []
  const unknownFinishes: LightweightIssue[] = []
  const nonStandardWeights: LightweightIssue[] = []
  const pathErrors: LightweightIssue[] = []
  let missingPositionCount = 0

  for (const legacyCard of legacyCards) {
    const kind = mapKind(legacyCard.type)
    const identity = parseLegacyIdentity(legacyCard.id)
    const rarity = getRarity(legacyCard.weight)
    if (!kind) {
      unknownKinds.push({ teamId, id: legacyCard.id, value: legacyCard.type })
      continue
    }
    if (!identity || !rarity) {
      pathErrors.push({
        teamId,
        id: legacyCard.id,
        value: legacyCard.id,
        reason: !identity ? 'invalid legacy card id' : 'weight outside configured ranges',
      })
      continue
    }

    const override = cardOverrides[legacyCard.id]
    const series = override?.series ?? identity.series
    const finish = override?.finish ?? identity.finish
    if (!(CARD_CATALOG_CONFIG.series as string[]).includes(series)) {
      unknownSeries.push({ teamId, id: legacyCard.id, value: series })
    }
    if (!(CARD_CATALOG_CONFIG.finishes as string[]).includes(finish)) {
      unknownFinishes.push({ teamId, id: legacyCard.id, value: finish })
    }
    if (identity.inferredSpecial && !override) {
      inferredSpecialCards.push({
        teamId,
        id: legacyCard.id,
        relatedId: identity.baseCardId,
        reason: 'special series inferred from dotted legacy id',
      })
    }
    if (!isLogicalCardPath(teamId, legacyCard.image)) {
      pathErrors.push({
        teamId,
        id: legacyCard.id,
        value: legacyCard.image,
        reason: 'invalid image path',
      })
    }
    if (!isStandardWeight(legacyCard.weight)) {
      nonStandardWeights.push({
        teamId,
        id: legacyCard.id,
        value: legacyCard.weight,
        reason: rarity,
      })
    }

    const card: DraftCard = {
      id: legacyCard.id,
      cardNumber: override?.cardNumber ?? identity.cardNumber,
      kind,
      displayName: legacyCard.fullName,
      image: legacyCard.image,
      series,
      finish,
    }
    if (series === 'base') {
      card.albumSlot = identity.albumSlot
    } else {
      card.baseCardId = override?.baseCardId ?? identity.baseCardId
    }
    if (rarity !== CARD_CATALOG_CONFIG.defaults.rarity) {
      card.rarity = rarity
    }
    if (kind === 'coach' || kind === 'player') {
      card.personId = legacyCard.personId?.trim() || createPersonId(legacyCard.fullName)
    }
    if (kind === 'coach') {
      card.role = 'HEAD_COACH'
    }
    if (kind === 'player') {
      card.position =
        normalizePosition(legacyCard.position) ?? getCachedPosition(teamId, card.personId ?? '')
      if (!card.position) {
        missingPositionCount += 1
      }
      if (Number.isInteger(legacyCard.shirtNumber) && Number(legacyCard.shirtNumber) >= 0) {
        card.shirtNumber = legacyCard.shirtNumber
      }
    }
    cards.push(card)
  }

  const cardsById = new Map(cards.map((card) => [card.id, card]))
  const invalidBaseCardReferences: LightweightIssue[] = []
  for (const card of cards) {
    if (!card.baseCardId) {
      if (card.series === 'special') {
        invalidBaseCardReferences.push({
          teamId,
          id: card.id,
          reason: 'special card has no baseCardId',
        })
      }
      continue
    }
    const baseCard = cardsById.get(card.baseCardId)
    if (!baseCard || baseCard.id === card.id || baseCard.series !== 'base') {
      invalidBaseCardReferences.push({
        teamId,
        id: card.id,
        relatedId: card.baseCardId,
        reason: !baseCard
          ? 'base card does not exist'
          : baseCard.id === card.id
            ? 'card references itself'
            : 'referenced card is not base series',
      })
      continue
    }
    if (card.displayName !== baseCard.displayName) {
      inheritanceWarnings.push({
        teamId,
        id: card.id,
        relatedId: baseCard.id,
        reason: 'displayName differs from base card',
      })
    }
    if (card.kind !== baseCard.kind || card.personId !== baseCard.personId) {
      blockingInheritanceMismatches.push({
        teamId,
        id: card.id,
        relatedId: baseCard.id,
        reason:
          card.kind !== baseCard.kind
            ? 'kind differs from base card'
            : 'personId differs from base card',
      })
    }
  }

  const baseCards = cards.filter((card) => card.series === 'base')
  const baseSlots = baseCards.flatMap((card) =>
    card.albumSlot === undefined ? [] : [card.albumSlot],
  )
  const expectedSlots = COLLECTION_CONFIG.baseAlbumSlotsPerTeam
  const duplicateCardNumbers = groupDuplicates(teamId, cards, (card) => card.cardNumber)
  const duplicateAlbumSlots = groupDuplicates(teamId, baseCards, (card) => card.albumSlot)
  const invalidTeamCardCount =
    cards.filter((card) => card.kind === 'team').length === 1
      ? []
      : [{ teamId, value: cards.filter((card) => card.kind === 'team').length }]
  const invalidBaseCardCount =
    baseCards.length === expectedSlots ? [] : [{ teamId, value: baseCards.length }]
  const missingBaseSlots = Array.from({ length: expectedSlots }, (_, index) => index + 1)
    .filter((slot) => !baseSlots.includes(slot))
    .map((slot) => ({ teamId, value: slot }))

  return {
    catalog: {
      schemaVersion: CARD_CATALOG_CONFIG.schemaVersion,
      collectionId: COLLECTION_CONFIG.id,
      teamId,
      defaults: {
        rarity: CARD_CATALOG_CONFIG.defaults.rarity as CardRarity,
        series: CARD_CATALOG_CONFIG.defaults.series as CardSeries,
        finish: CARD_CATALOG_CONFIG.defaults.finish as CardFinish,
        acquisition: [{ type: 'pack', poolId: 'standard' }],
      },
      cards,
    },
    missingPositionCount,
    duplicateCardNumbers,
    duplicateAlbumSlots,
    invalidTeamCardCount,
    invalidBaseCardCount,
    missingBaseSlots,
    invalidBaseCardReferences,
    inferredSpecialCards,
    inheritanceWarnings,
    blockingInheritanceMismatches,
    unknownKinds,
    unknownSeries,
    unknownFinishes,
    nonStandardWeights,
    pathErrors,
  }
}

const createEmptyReport = (): DryRunReport => ({
  schemaVersion: CARD_CATALOG_CONFIG.schemaVersion,
  collectionId: COLLECTION_CONFIG.id,
  completed: false,
  teamCount: 0,
  totalCardCount: 0,
  teamCardCount: 0,
  coachCardCount: 0,
  playerCardCount: 0,
  baseCardCount: 0,
  specialCardCount: 0,
  momentCardCount: 0,
  legendCardCount: 0,
  missingPositionCount: 0,
  teamsWithExtraCards: [],
  duplicateIds: [],
  duplicateCardNumbers: [],
  duplicateAlbumSlots: [],
  invalidTeamCardCount: [],
  invalidBaseCardCount: [],
  missingBaseSlots: [],
  invalidBaseCardReferences: [],
  inferredSpecialCards: [],
  inheritanceWarnings: [],
  blockingInheritanceMismatches: [],
  unknownKinds: [],
  unknownSeries: [],
  unknownFinishes: [],
  nonStandardWeights: [],
  pathErrors: [],
  teamProblems: [],
})

const getTeamCriticalErrorCount = (result: TeamMigrationResult): number =>
  result.duplicateCardNumbers.length +
  result.duplicateAlbumSlots.length +
  result.invalidTeamCardCount.length +
  result.invalidBaseCardCount.length +
  result.missingBaseSlots.length +
  result.invalidBaseCardReferences.length +
  result.blockingInheritanceMismatches.length +
  result.unknownKinds.length +
  result.unknownSeries.length +
  result.unknownFinishes.length +
  result.pathErrors.length

const addTeamToReport = (
  report: DryRunReport,
  teamId: string,
  result: TeamMigrationResult,
): void => {
  const cards = result.catalog.cards
  const baseCount = cards.filter((card) => card.series === 'base').length
  const additionalCount = cards.length - baseCount
  report.teamCount += 1
  report.totalCardCount += cards.length
  report.teamCardCount += cards.filter((card) => card.kind === 'team').length
  report.coachCardCount += cards.filter((card) => card.kind === 'coach').length
  report.playerCardCount += cards.filter((card) => card.kind === 'player').length
  report.baseCardCount += baseCount
  report.specialCardCount += cards.filter((card) => card.series === 'special').length
  report.momentCardCount += cards.filter((card) => card.series === 'moment').length
  report.legendCardCount += cards.filter((card) => card.series === 'legend').length
  report.missingPositionCount += result.missingPositionCount
  if (cards.length > COLLECTION_CONFIG.baseAlbumSlotsPerTeam) {
    report.teamsWithExtraCards.push({
      teamId,
      totalCardCount: cards.length,
      extraCardCount: cards.length - COLLECTION_CONFIG.baseAlbumSlotsPerTeam,
    })
  }

  report.duplicateCardNumbers.push(...result.duplicateCardNumbers)
  report.duplicateAlbumSlots.push(...result.duplicateAlbumSlots)
  report.invalidTeamCardCount.push(...result.invalidTeamCardCount)
  report.invalidBaseCardCount.push(...result.invalidBaseCardCount)
  report.missingBaseSlots.push(...result.missingBaseSlots)
  report.invalidBaseCardReferences.push(...result.invalidBaseCardReferences)
  report.inferredSpecialCards.push(...result.inferredSpecialCards)
  report.inheritanceWarnings.push(...result.inheritanceWarnings)
  report.blockingInheritanceMismatches.push(...result.blockingInheritanceMismatches)
  report.unknownKinds.push(...result.unknownKinds)
  report.unknownSeries.push(...result.unknownSeries)
  report.unknownFinishes.push(...result.unknownFinishes)
  report.nonStandardWeights.push(...result.nonStandardWeights)
  report.pathErrors.push(...result.pathErrors)
  report.teamProblems.push({
    teamId,
    totalCards: cards.length,
    baseCards: baseCount,
    additionalCards: additionalCount,
    missingPositions: result.missingPositionCount,
    warningCount: result.inferredSpecialCards.length + result.inheritanceWarnings.length,
    criticalErrorCount: getTeamCriticalErrorCount(result),
  })
}

const collectDuplicateIds = (ids: Map<string, string[]>): DuplicateIdIssue[] =>
  [...ids.entries()]
    .filter(([, teamIds]) => teamIds.length > 1)
    .map(([id, teamIds]) => ({ id, teamIds: [...new Set(teamIds)].sort() }))

const getCriticalErrorCount = (report: DryRunReport): number =>
  report.duplicateIds.length +
  report.duplicateCardNumbers.length +
  report.duplicateAlbumSlots.length +
  report.invalidTeamCardCount.length +
  report.invalidBaseCardCount.length +
  report.missingBaseSlots.length +
  report.invalidBaseCardReferences.length +
  report.blockingInheritanceMismatches.length +
  report.unknownKinds.length +
  report.unknownSeries.length +
  report.unknownFinishes.length +
  report.pathErrors.length

const assertSuccessfulDryRun = async (): Promise<void> => {
  const input = await readJson(dryRunReportPath)
  if (!isRecord(input)) {
    throw new Error('Dry-run report is invalid')
  }
  if (
    input.completed !== true ||
    input.schemaVersion !== CARD_CATALOG_CONFIG.schemaVersion ||
    input.teamCount !== COLLECTION_CONFIG.expectedTeamCount
  ) {
    throw new Error('A successful global --dry-run is required before --write')
  }
}

const createProgress = (): MigrationProgress => ({
  completedTeams: [],
  migratedTeamCount: 0,
  skippedTeamCount: 0,
  processedCards: 0,
  errorCount: 0,
  unresolvedFieldCount: 0,
  startedAt: new Date().toISOString(),
  schemaVersion: CARD_CATALOG_CONFIG.schemaVersion,
})

const readProgress = async (resume: boolean): Promise<MigrationProgress> => {
  if (!resume) {
    return createProgress()
  }
  try {
    const input = await readJson(progressPath)
    if (
      isRecord(input) &&
      Array.isArray(input.completedTeams) &&
      input.schemaVersion === CARD_CATALOG_CONFIG.schemaVersion
    ) {
      return input as unknown as MigrationProgress
    }
  } catch {
    return createProgress()
  }
  throw new Error('Migration progress is incompatible')
}

const readValidCatalog = async (filePath: string): Promise<CardCatalog | null> => {
  try {
    return parseCardCatalog(await readJson(filePath))
  } catch {
    return null
  }
}

const writeCatalog = async (teamDirectory: string, catalog: CardCatalog): Promise<void> => {
  const temporaryPath = path.join(teamDirectory, 'cards.part.json')
  const targetPath = path.join(teamDirectory, 'cards.json')
  try {
    await writeFile(temporaryPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
    parseCardCatalog(await readJson(temporaryPath))
    await rename(temporaryPath, targetPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

// Выполняет глобальный dry-run и обновляет агрегированный отчёт после каждой сборной.
const runDryRun = async (playerFiles: string[], teamIdFilter?: string): Promise<void> => {
  const report = createEmptyReport()
  const ids = new Map<string, string[]>()
  const selectedFiles = teamIdFilter
    ? playerFiles.filter((filePath) => path.basename(path.dirname(filePath)) === teamIdFilter)
    : playerFiles
  if (teamIdFilter && selectedFiles.length !== 1) {
    throw new Error(`Unknown team: ${teamIdFilter}`)
  }

  for (const [index, playerFile] of selectedFiles.entries()) {
    const teamId = path.basename(path.dirname(playerFile))
    const legacyCards = await parseLegacyCards(playerFile)
    const result = migrateTeam(teamId, legacyCards)
    for (const card of result.catalog.cards) {
      ids.set(card.id, [...(ids.get(card.id) ?? []), teamId])
    }
    addTeamToReport(report, teamId, result)
    await writeJsonAtomically(dryRunReportPath, report)
    console.log(
      `[${index + 1}/${selectedFiles.length}] ${teamId}: ${result.catalog.cards.length} cards, ` +
        `${result.missingPositionCount} unresolved positions`,
    )
  }

  report.duplicateIds = collectDuplicateIds(ids)
  report.completed =
    !teamIdFilter &&
    report.teamCount === COLLECTION_CONFIG.expectedTeamCount &&
    getCriticalErrorCount(report) === 0
  await writeJsonAtomically(dryRunReportPath, report)
  console.log(
    `Dry-run: ${report.teamCount} teams, ${report.totalCardCount} cards, ` +
      `${report.missingPositionCount} unresolved positions, ${getCriticalErrorCount(report)} critical errors.`,
  )
}

// Пишет только каталоги, допущенные полным dry-run, и фиксирует прогресс после каждой сборной.
const runWrite = async (
  playerFiles: string[],
  options: Pick<CliOptions, 'teamId' | 'resume'>,
): Promise<void> => {
  await assertSuccessfulDryRun()
  const progress = await readProgress(options.resume)
  const selectedFiles = options.teamId
    ? playerFiles.filter((filePath) => path.basename(path.dirname(filePath)) === options.teamId)
    : playerFiles
  if (options.teamId && selectedFiles.length !== 1) {
    throw new Error(`Unknown team: ${options.teamId}`)
  }

  for (const [index, playerFile] of selectedFiles.entries()) {
    const teamDirectory = path.dirname(playerFile)
    const teamId = path.basename(teamDirectory)
    const targetPath = path.join(teamDirectory, 'cards.json')
    const legacyCards = await parseLegacyCards(playerFile)
    const result = migrateTeam(teamId, legacyCards)

    try {
      if (getTeamCriticalErrorCount(result) > 0) {
        throw new Error('Team has critical migration errors')
      }
      const catalog = parseCardCatalog(result.catalog)
      const existingCatalog = await readValidCatalog(targetPath)
      const alreadyCompleted = progress.completedTeams.includes(teamId)
      const unchanged =
        existingCatalog && JSON.stringify(existingCatalog) === JSON.stringify(catalog)

      if ((options.resume && alreadyCompleted) || unchanged) {
        progress.skippedTeamCount += 1
      } else if (options.resume && existingCatalog) {
        progress.skippedTeamCount += 1
        progress.completedTeams.push(teamId)
      } else {
        await writeCatalog(teamDirectory, catalog)
        progress.migratedTeamCount += 1
        progress.processedCards += catalog.cards.length
        progress.completedTeams.push(teamId)
      }
      progress.unresolvedFieldCount += result.missingPositionCount
      progress.completedTeams = [...new Set(progress.completedTeams)].sort()
      await writeJsonAtomically(progressPath, progress)
      console.log(
        `[${index + 1}/${selectedFiles.length}] ${teamId}: ${catalog.cards.length} cards, ` +
          `${result.missingPositionCount} unresolved positions`,
      )
    } catch (error: unknown) {
      progress.errorCount += 1
      await writeJsonAtomically(progressPath, progress)
      console.error(`${teamId}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

const main = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2))
  const playerFiles = await findPlayerFiles()
  if (playerFiles.length !== COLLECTION_CONFIG.expectedTeamCount) {
    throw new Error(
      `Expected ${COLLECTION_CONFIG.expectedTeamCount} players.json files, found ${playerFiles.length}`,
    )
  }
  await mkdir(reportsDirectory, { recursive: true })
  if (options.mode === 'dry-run') {
    await runDryRun(playerFiles, options.teamId)
    return
  }
  await runWrite(playerFiles, options)
}

const isDirectExecution =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectExecution) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
