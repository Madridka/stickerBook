import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCardCatalog } from '../../src/schemas/cardCatalog.ts'
import type { CardCatalog } from '../../src/types/cardCatalog.ts'
import { migrateTeam, parseLegacyIdentity, type LegacyCard } from './migrate-cards.ts'

const createBaseCatalog = (): CardCatalog => ({
  schemaVersion: 2,
  collectionId: 'wc-26',
  teamId: 'test-team',
  defaults: {
    rarity: 'common',
    series: 'base',
    finish: 'standard',
    acquisition: [{ type: 'pack', poolId: 'standard' }],
  },
  cards: Array.from({ length: 20 }, (_, index) => ({
    id: `tst-${String(index + 1).padStart(2, '0')}`,
    cardNumber: String(index + 1).padStart(2, '0'),
    albumSlot: index + 1,
    kind: 'player' as const,
    displayName: `Player ${index + 1}`,
    image: `/cards/test-team/TST-${String(index + 1).padStart(2, '0')}.webp`,
    series: 'base' as const,
    finish: 'standard' as const,
    personId: `player-${index + 1}`,
    position: index === 0 ? ('GK' as const) : ('MF' as const),
  })),
})

test('schema accepts an additional special card without an album slot', () => {
  const catalog = createBaseCatalog()
  catalog.cards.push({
    ...catalog.cards[18],
    id: 'tst-19.1',
    cardNumber: '19.1',
    albumSlot: undefined,
    series: 'special',
    baseCardId: 'tst-19',
    image: '/cards/test-team/TST-19.1.webp',
  })

  assert.equal(parseCardCatalog(catalog).cards.length, 21)
})

test('schema rejects duplicate card numbers and base album slots', () => {
  const catalog = createBaseCatalog()
  catalog.cards[1].cardNumber = catalog.cards[0].cardNumber
  catalog.cards[1].albumSlot = catalog.cards[0].albumSlot

  assert.throws(() => parseCardCatalog(catalog))
})

test('schema rejects a special card with an invalid base reference', () => {
  const catalog = createBaseCatalog()
  catalog.cards.push({
    ...catalog.cards[18],
    id: 'tst-special',
    cardNumber: 'S1',
    albumSlot: undefined,
    series: 'special',
    baseCardId: 'tst-missing',
  })

  assert.throws(() => parseCardCatalog(catalog))
})

test('legacy dotted ids are parsed without coupling the runtime schema to their format', () => {
  assert.deepEqual(parseLegacyIdentity('esp-19.1'), {
    cardNumber: '19.1',
    albumSlot: undefined,
    series: 'special',
    finish: 'standard',
    baseCardId: 'esp-19',
    inferredSpecial: true,
  })
})

test('migration override produces a self-contained Spain special card', () => {
  const cards: LegacyCard[] = Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0')
    const displayName = index === 18 ? 'Ferran Torres' : `Player ${index + 1}`
    return {
      id: `esp-${number}`,
      fullName: displayName,
      image: `/cards/spain/ESP-${number}.webp`,
      type: 'player',
      team: 'Spain',
      weight: 20,
    }
  })
  cards.push({
    id: 'esp-19.1',
    fullName: 'Ferran Torres',
    image: '/cards/spain/ESP-19.1.webp',
    type: 'player',
    team: 'Spain',
    weight: 1,
  })

  const result = migrateTeam('spain', cards)
  const specialCard = result.catalog.cards.find((card) => card.id === 'esp-19.1')

  assert.equal(specialCard?.series, 'special')
  assert.equal(specialCard?.baseCardId, 'esp-19')
  assert.equal(specialCard?.albumSlot, undefined)
  assert.equal(result.duplicateAlbumSlots.length, 0)
  assert.equal(result.blockingInheritanceMismatches.length, 0)
})
