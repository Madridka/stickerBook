import { z } from 'zod'
import { CARD_CATALOG_CONFIG, COLLECTION_CONFIG } from '../data/mainConst.ts'
import type {
  CardCatalog,
  CardFinish,
  CardKind,
  CardRarity,
  CardSeries,
  CoachRole,
  PlayerPosition,
} from '../types/cardCatalog.ts'

const asEnumValues = <T extends string>(values: T[]): [T, ...T[]] => {
  if (values.length === 0) {
    throw new Error('Card catalog enum values must not be empty')
  }

  return values as [T, ...T[]]
}

const cardKindSchema = z.enum(asEnumValues(CARD_CATALOG_CONFIG.kinds as CardKind[]))
const playerPositionSchema = z.enum(
  asEnumValues(CARD_CATALOG_CONFIG.positions as PlayerPosition[]),
)
const coachRoleSchema = z.enum(asEnumValues(CARD_CATALOG_CONFIG.coachRoles as CoachRole[]))
const cardRaritySchema = z.enum(asEnumValues(CARD_CATALOG_CONFIG.rarities as CardRarity[]))
const cardSeriesSchema = z.enum(asEnumValues(CARD_CATALOG_CONFIG.series as CardSeries[]))
const cardFinishSchema = z.enum(asEnumValues(CARD_CATALOG_CONFIG.finishes as CardFinish[]))

const acquisitionSourceSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('pack'), poolId: z.string().min(1) }),
  z.strictObject({ type: z.literal('challenge'), challengeId: z.string().min(1) }),
  z.strictObject({ type: z.literal('minigame'), minigameId: z.string().min(1) }),
  z.strictObject({ type: z.literal('event'), eventId: z.string().min(1) }),
])

const baseCardShape = {
  id: z.string().min(1),
  cardNumber: z.string().min(1),
  albumSlot: z.number().int().positive().optional(),
  displayName: z.string().min(1),
  image: z.string().min(1),
  series: cardSeriesSchema,
  finish: cardFinishSchema,
  baseCardId: z.string().min(1).optional(),
  rarity: cardRaritySchema.optional(),
  acquisition: z.array(acquisitionSourceSchema).min(1).optional(),
  selectionWeight: z.number().positive().optional(),
}

// Разделяет обязательные поля команды, тренера и игрока на уровне runtime.
const cardSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...baseCardShape, kind: z.literal(cardKindSchema.enum.team) }),
  z.strictObject({
    ...baseCardShape,
    kind: z.literal(cardKindSchema.enum.coach),
    personId: z.string().min(1),
    role: coachRoleSchema,
  }),
  z.strictObject({
    ...baseCardShape,
    kind: z.literal(cardKindSchema.enum.player),
    personId: z.string().min(1),
    position: playerPositionSchema,
    shirtNumber: z.number().int().nonnegative().optional(),
  }),
])

const cardCatalogObjectSchema = z.strictObject({
  schemaVersion: z.literal(CARD_CATALOG_CONFIG.schemaVersion),
  collectionId: z.literal(COLLECTION_CONFIG.id),
  teamId: z.string().min(1),
  defaults: z.strictObject({
    rarity: cardRaritySchema,
    series: cardSeriesSchema,
    finish: cardFinishSchema,
    acquisition: z.array(acquisitionSourceSchema).min(1),
  }),
  cards: z.array(cardSchema),
})

// Проверяет связи и уникальность, которые зависят от полного каталога сборной.
export const cardCatalogSchema = cardCatalogObjectSchema.superRefine((catalog, context) => {
  const cardsById = new Map(catalog.cards.map((card) => [card.id, card]))
  const seenIds = new Set<string>()
  const seenCardNumbers = new Set<string>()

  catalog.cards.forEach((card, index) => {
    if (seenIds.has(card.id)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'id'],
        message: 'Duplicate card id',
      })
    }
    seenIds.add(card.id)

    if (seenCardNumbers.has(card.cardNumber)) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'cardNumber'],
        message: 'Duplicate card number',
      })
    }
    seenCardNumbers.add(card.cardNumber)

    if (card.series === 'base' && card.albumSlot === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'albumSlot'],
        message: 'Base card requires an album slot',
      })
    }

    if (card.series !== 'base' && card.albumSlot !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'albumSlot'],
        message: 'Additional card must not occupy a base album slot',
      })
    }

    if (card.series === 'special' && !card.baseCardId) {
      context.addIssue({
        code: 'custom',
        path: ['cards', index, 'baseCardId'],
        message: 'Special card requires a baseCardId',
      })
    }

    if (card.baseCardId) {
      const baseCard = cardsById.get(card.baseCardId)
      if (card.baseCardId === card.id) {
        context.addIssue({
          code: 'custom',
          path: ['cards', index, 'baseCardId'],
          message: 'Card must not reference itself',
        })
      } else if (!baseCard) {
        context.addIssue({
          code: 'custom',
          path: ['cards', index, 'baseCardId'],
          message: 'Referenced base card does not exist in this team',
        })
      } else if (baseCard.series !== 'base') {
        context.addIssue({
          code: 'custom',
          path: ['cards', index, 'baseCardId'],
          message: 'baseCardId must reference a base-series card',
        })
      }
    }
  })

  const baseCards = catalog.cards.filter((card) => card.series === 'base')
  const expectedSlotCount = COLLECTION_CONFIG.baseAlbumSlotsPerTeam
  if (catalog.cards.length < expectedSlotCount) {
    context.addIssue({
      code: 'custom',
      path: ['cards'],
      message: 'Catalog has too few total cards',
    })
  }
  if (baseCards.length !== expectedSlotCount) {
    context.addIssue({
      code: 'custom',
      path: ['cards'],
      message: `Expected ${expectedSlotCount} base cards, received ${baseCards.length}`,
    })
  }

  const baseSlots = baseCards.flatMap((card) =>
    card.albumSlot === undefined ? [] : [card.albumSlot],
  )
  if (new Set(baseSlots).size !== baseSlots.length) {
    context.addIssue({ code: 'custom', path: ['cards'], message: 'Duplicate base album slot' })
  }

  for (let slot = 1; slot <= expectedSlotCount; slot += 1) {
    if (!baseSlots.includes(slot)) {
      context.addIssue({
        code: 'custom',
        path: ['cards'],
        message: `Missing base album slot ${slot}`,
      })
    }
  }
})

export const parseCardCatalog = (input: unknown): CardCatalog =>
  cardCatalogSchema.parse(input) as CardCatalog
