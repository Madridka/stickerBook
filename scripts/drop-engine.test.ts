import assert from 'node:assert/strict'
import test from 'node:test'
import { DROP_ENGINE_CONFIG, PACK_CONFIGS } from '../src/data/mainConst.ts'
import type { Card, CardCatalog, CardRarity } from '../src/types/cardCatalog.ts'
import {
  getRenormalizedRarityOdds,
  selectCardV2,
  type RandomSource,
  type RarityOdds,
} from '../src/utils/dropEngine.ts'

const rarityOdds = PACK_CONFIGS.standard.rarityOdds as RarityOdds

const createCard = (
  id: string,
  rarity: CardRarity,
  options: Pick<Card, 'acquisition' | 'selectionWeight'> = {},
): Card => ({
  id,
  cardNumber: id,
  albumSlot: 1,
  kind: 'team',
  displayName: id,
  image: `/${id}.webp`,
  series: 'base',
  finish: 'standard',
  rarity,
  ...options,
})

const createCatalog = (cards: Card[]): CardCatalog => ({
  schemaVersion: 2,
  collectionId: 'wc-26',
  teamId: 'test-team',
  defaults: {
    rarity: 'common',
    series: 'base',
    finish: 'standard',
    acquisition: [{ type: 'pack', poolId: 'standard' }],
  },
  cards,
})

const createSequenceRng = (values: number[]): RandomSource => {
  let index = 0
  return (): number => values[index++ % values.length] ?? 0
}

const createSeededRng = (seed: number): RandomSource => {
  let state = seed >>> 0
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

const select = (catalog: CardCatalog, randomSource: RandomSource): Card =>
  selectCardV2({
    catalogs: [catalog],
    packConfig: { cardsPerPack: PACK_CONFIGS.standard.cardsPerPack, rarityOdds },
    poolId: 'standard',
    defaultSelectionWeight: DROP_ENGINE_CONFIG.defaultSelectionWeight,
    randomSource,
  })

test('configured rarity odds total exactly 100', () => {
  assert.equal(Object.values(rarityOdds).reduce((total, value) => total + value, 0), 100)
})

test('empty rarity pools are removed without an error', () => {
  const card = createCard('common-only', 'common')
  assert.equal(select(createCatalog([card]), createSequenceRng([0.99, 0])).id, card.id)
})

test('rarity odds are renormalized between available pools', () => {
  const normalized = getRenormalizedRarityOdds(rarityOdds, new Set(['common', 'rare']))
  assert.ok(Math.abs((normalized.common ?? 0) + (normalized.rare ?? 0) - 100) < 1e-10)
  assert.ok(Math.abs((normalized.common ?? 0) - 95.8163372032) < 1e-9)
})

test('cards outside the selected pack pool cannot drop', () => {
  const allowed = createCard('allowed', 'common')
  const excluded = createCard('excluded', 'common', {
    acquisition: [{ type: 'event', eventId: 'launch' }],
    selectionWeight: 100000,
  })
  const catalog = createCatalog([allowed, excluded])
  for (let index = 0; index < 100; index += 1) {
    assert.equal(select(catalog, createSeededRng(index + 1)).id, allowed.id)
  }
})

test('selectionWeight changes selection only inside the selected rarity', () => {
  const light = createCard('light', 'common', { selectionWeight: 1 })
  const heavy = createCard('heavy', 'common', { selectionWeight: 9 })
  const rare = createCard('rare', 'rare', { selectionWeight: 100000 })
  const catalog = createCatalog([light, heavy, rare])

  assert.equal(select(catalog, createSequenceRng([0, 0.5])).id, heavy.id)
  assert.equal(select(catalog, createSequenceRng([0.99, 0])).id, rare.id)
})

test('seeded random source produces a reproducible sequence', () => {
  const catalog = createCatalog([
    createCard('common', 'common'),
    createCard('uncommon', 'uncommon'),
    createCard('rare', 'rare'),
    createCard('epic', 'epic'),
    createCard('legendary', 'legendary'),
  ])
  const draw = (seed: number): string[] => {
    const randomSource = createSeededRng(seed)
    return Array.from({ length: 50 }, () => select(catalog, randomSource).id)
  }
  assert.deepEqual(draw(2026), draw(2026))
})

test('drop engine always returns a card from the available catalog', () => {
  const cards = [createCard('one', 'common'), createCard('two', 'rare')]
  const catalog = createCatalog(cards)
  const ids = new Set(cards.map((card) => card.id))
  const randomSource = createSeededRng(48)
  for (let index = 0; index < 1000; index += 1) {
    assert.ok(ids.has(select(catalog, randomSource).id))
  }
})

test('fixed-seed statistical smoke test follows configured rarity odds', () => {
  const cards = (Object.keys(rarityOdds) as CardRarity[]).map((rarity) =>
    createCard(rarity, rarity),
  )
  const catalog = createCatalog(cards)
  const counts = Object.fromEntries(cards.map((card) => [card.rarity, 0])) as Record<
    CardRarity,
    number
  >
  const iterations = 100000
  const randomSource = createSeededRng(2607)
  for (let index = 0; index < iterations; index += 1) {
    const rarity = select(catalog, randomSource).rarity ?? 'common'
    counts[rarity] += 1
  }

  for (const rarity of Object.keys(rarityOdds) as CardRarity[]) {
    const actualPercent = (counts[rarity] / iterations) * 100
    assert.ok(Math.abs(actualPercent - rarityOdds[rarity]) < 0.5)
  }
})
