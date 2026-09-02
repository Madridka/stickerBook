import type { BlisterConfig, PackConfig } from '../types/gameConfig.ts'
import type { CardRarity } from '../types/cardCatalog.ts'
import type { PickShopOffer } from '../types/pickShop.ts'

export type PackHuntRewardSelection = 'fixed' | 'random' | 'rotation'

/** Стоимость одного стандартного пака в игровых монетах. */
export const PACK_PRICE: number = 30

/** Количество карточек, которое игрок получает из одного стандартного пака. */
export const CARDS_PER_PACK: number = 5

/** Период недоступности бесплатного пака после завершения мини-игры. */
export const FREE_PACK_COOLDOWN_MS: number = 4 * 60 * 60 * 1_000

/** Базовые настройки выбора карточки движком выпадения. */
export const DROP_ENGINE_CONFIG = {
  defaultSelectionWeight: 1,
}

/** Правила допуска в публичный рейтинг и отображаемые в нём журналы. */
export const LEADERBOARD_CONFIG = {
  minimumCards: 50,
  albumIds: ['wc-26', 'ucl-26-27', 'rpl-26-27', 'tomsk', 'spainClubsLogo', 'russiaClubsLogo', 'englandClubsLogo'],
} as const

export type LeaderboardAlbumId = (typeof LEADERBOARD_CONFIG.albumIds)[number]

/** Скрытая защита late-game коллекции от серии паков без новых карточек. */
export const PITY_CONFIG = {
  minCompletionRatio: 0.95,
  minDryPacksBeforeGuarantee: 2,
  maxDryPacksBeforeGuarantee: 6,
  guaranteedMissingCards: 1,
} as const

/** Содержимое и вероятность выпадения редкостей для каждого типа пака. */
export const PACK_CONFIGS = {
  standard: {
    cardsPerPack: CARDS_PER_PACK,
    rarityOdds: {
      common: 80,
      uncommon: 10,
      rare: 7,
      epic: 2.15,
      legendary: 0.85,
    },
  },
} satisfies Record<string, PackConfig>

const CARD_RARITIES: readonly CardRarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]

const CLUB_LOGO_CARD_DROP_WEIGHTS: Readonly<Record<CardRarity, number>> = {
  common: 1,
  uncommon: 0.35,
  rare: 0.1,
  epic: 0,
  legendary: 0,
}

/** Builds rarity odds from the actual catalog size, preserving per-card drop ratios. */
export const createClubLogoRarityOdds = (
  cards: readonly { rarity: CardRarity }[],
): PackConfig['rarityOdds'] => {
  const counts: Record<CardRarity, number> = {
    common: 0,
    uncommon: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  }
  for (const card of cards) counts[card.rarity] += 1

  const totalWeight: number = CARD_RARITIES.reduce(
    (total, rarity) => total + counts[rarity] * CLUB_LOGO_CARD_DROP_WEIGHTS[rarity],
    0,
  )
  if (totalWeight <= 0) throw new Error('Club-logo catalog must contain weighted cards')

  return Object.fromEntries(
    CARD_RARITIES.map((rarity) => [
      rarity,
      ((counts[rarity] * CLUB_LOGO_CARD_DROP_WEIGHTS[rarity]) / totalWeight) * 100,
    ]),
  ) as PackConfig['rarityOdds']
}

const CLUB_LOGO_FALLBACK_RARITY_ODDS: PackConfig['rarityOdds'] =
  createClubLogoRarityOdds([
    { rarity: 'common' },
    { rarity: 'uncommon' },
    { rarity: 'rare' },
  ])

/** Экономика, содержимое и кулдауны покупаемых блистеров. */
export const BLISTER_CONFIGS = {
  mixed: {
    id: 'mixed',
    albumId: 'wc-26',
    albumIds: ['wc-26', 'tomsk', 'ucl-26-27', 'rpl-26-27', 'spainClubsLogo', 'russiaClubsLogo', 'englandClubsLogo'],
    titleKey: 'shop.blisters.mixed.title',
    descriptionKey: 'shop.blisters.mixed.description',
    shortNameKey: 'shop.blisters.mixed.shortName',
    cost: 40,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: '*',
    pityEligible: false,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  standard: {
    id: 'standard',
    albumId: 'wc-26',
    albumIds: ['wc-26'],
    titleKey: 'shop.blisters.wc26.title',
    descriptionKey: 'shop.blisters.wc26.description',
    shortNameKey: 'shop.blisters.wc26.shortName',
    cost: PACK_PRICE,
    cardsPerPack: CARDS_PER_PACK,
    cooldownMs: 0,
    poolId: 'standard',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  kdv: {
    id: 'kdv',
    albumId: 'tomsk',
    albumIds: ['tomsk'],
    titleKey: 'shop.blisters.tomsk.title',
    descriptionKey: 'shop.blisters.tomsk.description',
    shortNameKey: 'shop.blisters.tomsk.shortName',
    cost: 50,
    cardsPerPack: 3,
    cooldownMs: 60 * 60 * 1_000,
    poolId: 'standard',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  ucl: {
    id: 'ucl',
    albumId: 'ucl-26-27',
    albumIds: ['ucl-26-27'],
    titleKey: 'shop.blisters.ucl.title',
    descriptionKey: 'shop.blisters.ucl.description',
    shortNameKey: 'shop.blisters.ucl.shortName',
    cost: 20,
    cardsPerPack: 4,
    cooldownMs: 30 * 60 * 1_000,
    poolId: 'ucl-26-27-standard',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  rpl: {
    id: 'rpl',
    albumId: 'rpl-26-27',
    albumIds: ['rpl-26-27'],
    titleKey: 'shop.blisters.rpl.title',
    descriptionKey: 'shop.blisters.rpl.description',
    shortNameKey: 'shop.blisters.rpl.shortName',
    cost: 25,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'rpl-26-27-standard',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  spainLogos: {
    id: 'spain-logos',
    albumId: 'spainClubsLogo',
    albumIds: ['spainClubsLogo'],
    titleKey: 'shop.blisters.spainLogos.title',
    descriptionKey: 'shop.blisters.spainLogos.description',
    shortNameKey: 'shop.blisters.spainLogos.shortName',
    cost: 35,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'spain-clubs-logo-development',
    pityEligible: true,
    rarityOdds: CLUB_LOGO_FALLBACK_RARITY_ODDS,
  },
  russiaLogos: {
    id: 'russia-logos',
    albumId: 'russiaClubsLogo',
    albumIds: ['russiaClubsLogo'],
    titleKey: 'shop.blisters.russiaLogos.title',
    descriptionKey: 'shop.blisters.russiaLogos.description',
    shortNameKey: 'shop.blisters.russiaLogos.shortName',
    cost: 35,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'russia-clubs-logo-standard',
    pityEligible: true,
    rarityOdds: CLUB_LOGO_FALLBACK_RARITY_ODDS,
  },
  englandLogos: {
    id: 'england-logos',
    albumId: 'englandClubsLogo',
    albumIds: ['englandClubsLogo'],
    titleKey: 'shop.blisters.englandLogos.title',
    descriptionKey: 'shop.blisters.englandLogos.description',
    shortNameKey: 'shop.blisters.englandLogos.shortName',
    cost: 35,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'england-clubs-logo-standard',
    pityEligible: true,
    rarityOdds: CLUB_LOGO_FALLBACK_RARITY_ODDS,
  },
} satisfies Record<string, BlisterConfig>

/** Выбор бесплатного блистера за мини-игру. */
export const PACK_HUNT_REWARD_CONFIG = {
  /**
   * fixed — всегда первый блистер из blisterIds;
   * random — случайный блистер из списка;
   * rotation — смена блистера по времени с начала локального дня.
   */
  selection: 'fixed' as PackHuntRewardSelection,
  blisterIds: [
    BLISTER_CONFIGS.ucl.id,
    BLISTER_CONFIGS.rpl.id,
    BLISTER_CONFIGS.standard.id,
    BLISTER_CONFIGS.mixed.id,
    BLISTER_CONFIGS.spainLogos.id,
    BLISTER_CONFIGS.russiaLogos.id,
    BLISTER_CONFIGS.englandLogos.id,
    BLISTER_CONFIGS.kdv.id,
  ],
  rotationIntervalMs: FREE_PACK_COOLDOWN_MS,
}

/** Баланс энергии и начислений кликера. */
export const CLICKER_CONFIG = {
  baseReward: 1,
  /** Максимальная прибавка к награде при полностью заполненном журнале: +50%. */
  maxCollectionProgressBonus: 0.5,
  energyLimit: 100,
  energyCostPerClick: 1,
  fullRechargeMs: 7_200_000,
  rewardPrecision: 2,
  energyEpsilon: 0.000001,
}

/** Экономика обмена повторных карточек. */
export const DUPLICATE_EXCHANGE_CONFIG = {
  tradeInCount: 5,
  candidateCount: 5,
}

/** Единая экономика повторок и пиков. */
export const PICK_SHOP_CONFIG = {
  duplicatesPerToken: 5,
  candidateCount: 5,
  randomPityMinDryPicks: 4,
  randomPityMaxDryPicks: 7,
  premiumRarities: ['rare', 'epic', 'legendary'] as readonly CardRarity[],
  journalRarityOdds: {
    common: 65,
    uncommon: 17,
    rare: 12,
    epic: 4.5,
    legendary: 1.5,
  } satisfies Record<CardRarity, number>,
} as const

/** Порядок витрины: актуальные соревнования выше, локальная история — в конце. */
export const BLISTER_SHOP_PRIORITY: readonly string[] = [
  BLISTER_CONFIGS.ucl.id,
  BLISTER_CONFIGS.rpl.id,
  BLISTER_CONFIGS.standard.id,
  BLISTER_CONFIGS.mixed.id,
  BLISTER_CONFIGS.spainLogos.id,
  BLISTER_CONFIGS.russiaLogos.id,
  BLISTER_CONFIGS.englandLogos.id,
  BLISTER_CONFIGS.kdv.id,
]

/** Журнальные пики стоят столько же, сколько соответствующие блистеры. */
export const PICK_SHOP_OFFERS: readonly PickShopOffer[] = [
  { id: 'ucl', kind: 'album', albumId: BLISTER_CONFIGS.ucl.albumId, cost: BLISTER_CONFIGS.ucl.cost, titleKey: 'shop.picks.ucl.title', descriptionKey: 'shop.picks.ucl.description', priority: 10, guaranteedNew: true },
  { id: 'rpl', kind: 'album', albumId: BLISTER_CONFIGS.rpl.albumId, cost: BLISTER_CONFIGS.rpl.cost, titleKey: 'shop.picks.rpl.title', descriptionKey: 'shop.picks.rpl.description', priority: 20, guaranteedNew: true },
  { id: 'wc', kind: 'album', albumId: BLISTER_CONFIGS.standard.albumId, cost: BLISTER_CONFIGS.standard.cost, titleKey: 'shop.picks.wc.title', descriptionKey: 'shop.picks.wc.description', priority: 30, guaranteedNew: true },
  { id: 'premium', kind: 'premium', cost: 20, titleKey: 'shop.picks.premium.title', descriptionKey: 'shop.picks.premium.description', priority: 40, guaranteedNew: false },
  { id: 'random', kind: 'random', cost: 1, titleKey: 'shop.picks.random.title', descriptionKey: 'shop.picks.random.description', priority: 50, guaranteedNew: false },
  { id: 'spain-logos', kind: 'album', albumId: BLISTER_CONFIGS.spainLogos.albumId, cost: BLISTER_CONFIGS.spainLogos.cost, titleKey: 'shop.picks.spainLogos.title', descriptionKey: 'shop.picks.logos.description', priority: 60, guaranteedNew: true },
  { id: 'russia-logos', kind: 'album', albumId: BLISTER_CONFIGS.russiaLogos.albumId, cost: BLISTER_CONFIGS.russiaLogos.cost, titleKey: 'shop.picks.russiaLogos.title', descriptionKey: 'shop.picks.logos.description', priority: 61, guaranteedNew: true },
  { id: 'england-logos', kind: 'album', albumId: BLISTER_CONFIGS.englandLogos.albumId, cost: BLISTER_CONFIGS.englandLogos.cost, titleKey: 'shop.picks.englandLogos.title', descriptionKey: 'shop.picks.logos.description', priority: 62, guaranteedNew: true },
  { id: 'tomsk', kind: 'album', albumId: BLISTER_CONFIGS.kdv.albumId, cost: BLISTER_CONFIGS.kdv.cost, titleKey: 'shop.picks.tomsk.title', descriptionKey: 'shop.picks.tomsk.description', priority: 100, guaranteedNew: true },
]

/** Размер дневной ротации и выбора награды. */
export const DAILY_TASK_CONFIG = {
  tasksPerDay: 3,
  rewardCandidateCount: 3,
}

/** Продолжительность календарного дня в миллисекундах. */
export const MILLISECONDS_PER_DAY: number = 24 * 60 * 60 * 1_000

/** Баланс хранения и восстановления удалённых карточек. */
export const DELETED_CARD_CONFIG = {
  retentionMs: 7 * MILLISECONDS_PER_DAY,
  restoredQuality: 90,
}
