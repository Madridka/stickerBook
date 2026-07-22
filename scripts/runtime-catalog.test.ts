import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import gameData from '../src/data/mainConst.json' with { type: 'json' }
import { loadCardCatalogs } from '../src/data/cardCatalogLoader.ts'
import type { CardRarity } from '../src/types/cardCatalog.ts'
import { createDuplicateExchangeCandidates } from '../src/utils/createDuplicateExchangeCandidates.ts'
import { selectCardV2, type RandomSource } from '../src/utils/dropEngine.ts'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(scriptDirectory, '../src/data/wc-26')

const createSeededRng = (seed: number): RandomSource => {
  let state = seed >>> 0
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const readTeamData = async (
  fileName: 'cards.json' | 'pages.json',
): Promise<unknown[]> => {
  const entries = await readdir(dataDirectory, { withFileTypes: true })
  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry): Promise<unknown> =>
        JSON.parse(await readFile(path.join(dataDirectory, entry.name, fileName), 'utf8')),
      ),
  )
}

test('runtime loader validates and normalizes all catalogs without mutation', async () => {
  const inputs = await readTeamData('cards.json')
  const snapshot = JSON.stringify(inputs)
  const catalogs = loadCardCatalogs(inputs, '/game/')
  const cards = catalogs.flatMap((catalog) => catalog.cards)

  assert.equal(catalogs.length, 48)
  assert.equal(cards.length, 961)
  assert.equal(JSON.stringify(inputs), snapshot)
  assert.equal(new Set(cards.map((card) => card.id)).size, cards.length)
  assert.ok(cards.every((card) => card.collectionId === 'wc-26'))
  assert.ok(cards.every((card) => card.teamId.length > 0))
  assert.ok(cards.every((card) => card.image.startsWith('/game/cards/')))
  assert.ok(cards.every((card) => card.selectionWeight > 0))
  assert.ok(cards.every((card) => card.acquisition.length > 0))
  assert.ok(cards.some((card) => card.kind === 'team'))
  assert.ok(cards.some((card) => card.kind === 'coach'))
  assert.ok(cards.some((card) => card.kind === 'player' && card.position === 'GK'))
})

test('pack opening and duplicate exchange use normalized cards', async () => {
  const catalogs = loadCardCatalogs(await readTeamData('cards.json'))
  const allIds = new Set(catalogs.flatMap((catalog) => catalog.cards.map((card) => card.id)))
  const randomSource = createSeededRng(2026)
  const packIds = Array.from({ length: gameData.packConfigs.standard.cardsPerPack }, () =>
    selectCardV2({
      catalogs,
      packConfig: {
        cardsPerPack: gameData.packConfigs.standard.cardsPerPack,
        rarityOdds: gameData.packConfigs.standard.rarityOdds as Record<CardRarity, number>,
      },
      poolId: 'standard',
      defaultSelectionWeight: gameData.dropEngine.defaultSelectionWeight,
      randomSource,
    }).id,
  )
  assert.equal(packIds.length, 5)
  assert.ok(packIds.every((id) => allIds.has(id)))

  const excluded = new Set(packIds.slice(0, 2))
  const candidates = createDuplicateExchangeCandidates(
    catalogs,
    excluded,
    gameData.duplicateExchange.candidateCount,
    randomSource,
  )
  assert.equal(candidates.length, gameData.duplicateExchange.candidateCount)
  assert.equal(new Set(candidates).size, candidates.length)
  assert.ok(candidates.every((id) => allIds.has(id) && !excluded.has(id)))
})

test('special variants keep their base album slot relationship', async () => {
  const catalogs = loadCardCatalogs(await readTeamData('cards.json'))
  const cards = catalogs.flatMap((catalog) => catalog.cards)
  const special = cards.find((card) => card.id === 'esp-19.1')
  assert.equal(special?.baseCardId, 'esp-19')
  assert.ok(cards.some((card) => card.id === special?.baseCardId && card.series === 'base'))
})

test('every album slot resolves to a normalized base card', async () => {
  const catalogs = loadCardCatalogs(await readTeamData('cards.json'))
  const baseCardIds = new Set(
    catalogs.flatMap((catalog) =>
      catalog.cards.filter((card) => card.series === 'base').map((card) => card.id),
    ),
  )
  const teamPages = (await readTeamData('pages.json')) as Array<
    Array<{ slots: Array<{ playerId: string }> }>
  >
  const slotPlayerIds = teamPages.flatMap((pages) =>
    pages.flatMap((page) => page.slots.map((slot) => slot.playerId)),
  )
  assert.equal(slotPlayerIds.length, 960)
  assert.ok(slotPlayerIds.every((playerId) => baseCardIds.has(playerId)))
})
