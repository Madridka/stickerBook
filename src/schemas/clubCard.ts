import { z } from 'zod'
import { CARD_CATALOG_CONFIG } from '@/data/mainConst'
import type { TeamCard } from '@/types/cardCatalog'

const clubCardSchema = z.strictObject({
  id: z.string().min(1),
  cardNumber: z.string().min(1),
  albumSlot: z.number().int().positive(),
  displayName: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  foundedYear: z.number().int().positive(),
  stadium: z.string().min(1),
  leagueId: z.string().min(1),
  countryCode: z.string().length(3),
  image: z.string().min(1),
  series: z.literal(CARD_CATALOG_CONFIG.series[0]),
  finish: z.enum(CARD_CATALOG_CONFIG.finishes),
  rarity: z.enum(CARD_CATALOG_CONFIG.rarities),
  kind: z.literal('team'),
})

export const parseClubCards = (input: unknown): TeamCard[] =>
  z.array(clubCardSchema).min(1).parse(input) as TeamCard[]
