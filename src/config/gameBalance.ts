import type { BlisterConfig, PackConfig } from '../types/gameConfig.ts'

export type PackHuntRewardSelection = 'fixed' | 'random' | 'rotation'

/** Стоимость одного стандартного пака в игровых монетах. */
export const PACK_PRICE: number = 20

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
  albumIds: ['wc-26', 'ucl-26-27', 'tomsk', 'spainClubsLogo', 'russiaClubsLogo', 'englandClubsLogo'],
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

/** Экономика, содержимое и кулдауны покупаемых блистеров. */
export const BLISTER_CONFIGS = {
  mixed: {
    id: 'mixed',
    albumId: 'wc-26',
    albumIds: ['wc-26', 'tomsk', 'ucl-26-27', 'spainClubsLogo', 'russiaClubsLogo', 'englandClubsLogo'],
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
    cost: 30,
    cardsPerPack: 4,
    cooldownMs: 30 * 60 * 1_000,
    poolId: 'ucl-26-27-standard',
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
    cost: 10,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'spain-clubs-logo-development',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  russiaLogos: {
    id: 'russia-logos',
    albumId: 'russiaClubsLogo',
    albumIds: ['russiaClubsLogo'],
    titleKey: 'shop.blisters.russiaLogos.title',
    descriptionKey: 'shop.blisters.russiaLogos.description',
    shortNameKey: 'shop.blisters.russiaLogos.shortName',
    cost: 10,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'russia-clubs-logo-standard',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  englandLogos: {
    id: 'england-logos',
    albumId: 'englandClubsLogo',
    albumIds: ['englandClubsLogo'],
    titleKey: 'shop.blisters.englandLogos.title',
    descriptionKey: 'shop.blisters.englandLogos.description',
    shortNameKey: 'shop.blisters.englandLogos.shortName',
    cost: 10,
    cardsPerPack: 5,
    cooldownMs: 0,
    poolId: 'england-clubs-logo-standard',
    pityEligible: true,
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
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
    BLISTER_CONFIGS.mixed.id,
    BLISTER_CONFIGS.standard.id,
    BLISTER_CONFIGS.ucl.id,
    BLISTER_CONFIGS.kdv.id,
    BLISTER_CONFIGS.spainLogos.id,
    BLISTER_CONFIGS.russiaLogos.id,
    BLISTER_CONFIGS.englandLogos.id,
  ],
  rotationIntervalMs: FREE_PACK_COOLDOWN_MS,
}

/** Баланс энергии и начислений кликера. */
export const CLICKER_CONFIG = {
  baseReward: 1,
  /** Максимальная прибавка к награде при полностью заполненном журнале: +50%. */
  maxAlbumProgressBonus: 0.5,
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
