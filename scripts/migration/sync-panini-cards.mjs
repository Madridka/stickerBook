import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '../..')
const TEAMS_ROOT = path.join(PROJECT_ROOT, 'src/data/wc-26')

const catalogPath = process.argv[2]

if (!catalogPath) {
  throw new Error('Pass the Panini catalog JSON path as the first argument.')
}

const SKIPPED_TEAMS = new Set([
  'argentina',
  'croatia',
  'czechia',
  'korea-republic',
  'mexico',
  'netherlands',
  'portugal',
  'south-africa',
  'spain',
])

// Panini arranges each team by position. These boundaries cover the base
// checklist after slots 1 (emblem) and 13 (team photo) are removed.
const POSITION_BOUNDARIES = {
  ALG: [2, 7, 14],
  AUS: [3, 10, 16],
  AUT: [3, 9, 18],
  BEL: [2, 8, 15],
  BIH: [2, 7, 16],
  BRA: [3, 8, 12],
  CAN: [2, 9, 16],
  CIV: [2, 9, 15],
  COD: [2, 7, 12],
  COL: [3, 9, 16],
  CPV: [2, 9, 14],
  CUW: [2, 8, 16],
  ECU: [3, 8, 14],
  EGY: [2, 9, 15],
  ENG: [2, 8, 14],
  FRA: [2, 8, 12],
  GER: [2, 9, 15],
  GHA: [2, 8, 14],
  HAI: [2, 9, 14],
  IRN: [2, 10, 15],
  IRQ: [2, 8, 17],
  JOR: [2, 8, 14],
  JPN: [2, 7, 16],
  KSA: [3, 8, 15],
  MAR: [3, 9, 15],
  NOR: [2, 8, 14],
  NZL: [3, 9, 16],
  PAN: [3, 9, 15],
  PAR: [3, 8, 14],
  QAT: [2, 9, 16],
  SCO: [2, 10, 17],
  SEN: [3, 8, 14],
  SUI: [3, 8, 16],
  SWE: [2, 7, 16],
  TUN: [3, 8, 14],
  TUR: [2, 9, 16],
  URU: [3, 9, 15],
  USA: [2, 7, 17],
  UZB: [2, 9, 15],
}

const POSITION_OVERRIDES = {
  BRA12: 'FW',
  CUW14: 'FW',
  NOR12: 'FW',
}

const SPECIAL_LETTERS = {
  Æ: 'Ae',
  æ: 'ae',
  Ð: 'D',
  ð: 'd',
  Ø: 'O',
  ø: 'o',
  Œ: 'Oe',
  œ: 'oe',
  Þ: 'Th',
  þ: 'th',
  ß: 'ss',
  ı: 'i',
  Ł: 'L',
  ł: 'l',
}

function toAscii(value) {
  return value
    .replace(/[ÆæÐðØøŒœÞþßıŁł]/g, character => SPECIAL_LETTERS[character])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[‘’]/g, "'")
}

function normalizeName(value) {
  return toAscii(value).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function slugify(value) {
  return toAscii(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stickerNumber(code) {
  const match = code.match(/\d+$/)
  return match ? Number(match[0]) : Number.NaN
}

function fallbackPosition(prefix, number) {
  const override = POSITION_OVERRIDES[`${prefix}${number}`]

  if (override) {
    return override
  }

  const boundaries = POSITION_BOUNDARIES[prefix]

  if (!boundaries) {
    throw new Error(`Position boundaries are missing for ${prefix}.`)
  }

  const [goalkeeperEnd, defenderEnd, midfielderEnd] = boundaries

  if (number <= goalkeeperEnd) return 'GK'
  if (number <= defenderEnd) return 'DF'
  if (number <= midfielderEnd) return 'MF'
  return 'FW'
}

const catalog = JSON.parse(await readFile(path.resolve(catalogPath), 'utf8'))
const teamDirectories = await readdir(TEAMS_ROOT, { withFileTypes: true })
let updatedTeamCount = 0

for (const directory of teamDirectories) {
  if (!directory.isDirectory() || SKIPPED_TEAMS.has(directory.name)) {
    continue
  }

  const cardsPath = path.join(TEAMS_ROOT, directory.name, 'cards.json')
  let teamData

  try {
    teamData = JSON.parse(await readFile(cardsPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') continue
    throw error
  }

  const prefix = teamData.cards[0].id.split('-')[0].toUpperCase()
  const officialPlayers = catalog.stickers
    .filter(sticker => sticker.code.startsWith(prefix))
    .map(sticker => ({ ...sticker, number: stickerNumber(sticker.code) }))
    .filter(sticker => Number.isFinite(sticker.number))
    .filter(sticker => sticker.number !== 1 && sticker.number !== 13)
    .sort((left, right) => left.number - right.number)

  if (officialPlayers.length !== 18) {
    throw new Error(
      `${directory.name}: expected 18 Panini players, found ${officialPlayers.length}.`,
    )
  }

  const knownPositions = new Map(
    teamData.cards
      .filter(card => card.kind === 'player')
      .map(card => [normalizeName(card.displayName), card.position]),
  )
  const imageDirectory = teamData.cards[0].image.slice(
    0,
    teamData.cards[0].image.lastIndexOf('/'),
  )

  officialPlayers.forEach((player, playerIndex) => {
    const card = teamData.cards[playerIndex + 2]
    const displayName = toAscii(player.name)
    const personId = slugify(displayName)
    const cardNumber = String(card.albumSlot).padStart(2, '0')

    card.displayName = displayName
    card.image = `${imageDirectory}/${prefix}-${cardNumber}-${personId}.webp`
    card.personId = personId
    card.position =
      knownPositions.get(normalizeName(player.name)) ??
      fallbackPosition(prefix, player.number)
  })

  await writeFile(cardsPath, `${JSON.stringify(teamData, null, 2)}\n`, 'utf8')
  updatedTeamCount += 1
}

console.log(`Updated ${updatedTeamCount} team card catalogs.`)
