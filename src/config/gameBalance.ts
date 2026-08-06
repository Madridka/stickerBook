import type { BlisterConfig, PackConfig } from '@/types/gameConfig'

/** Стоимость одного стандартного пака в игровых монетах. */
export const PACK_PRICE: number = 20

/** Количество карточек, которое игрок получает из одного стандартного пака. */
export const CARDS_PER_PACK: number = 5

/** Стоимость блистера доступной эпохи журнала «История Томи». */
export const KDV_BLISTER_COST: number = 50

/** Количество карточек в блистере журнала «История Томи». */
export const KDV_BLISTER_CARD_COUNT: number = 1

/** Период недоступности блистера «История Томи» после покупки. */
export const KDV_BLISTER_COOLDOWN_MS: number = 4 * 60 * 60 * 1_000

/** Период недоступности бесплатного пака после завершения мини-игры. */
export const FREE_PACK_COOLDOWN_MS: number = 4 * 60 * 60 * 1_000

/** Базовые настройки выбора карточки движком выпадения. */
export const DROP_ENGINE_CONFIG = {
  defaultSelectionWeight: 1,
}

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
  standard: {
    id: 'standard',
    albumId: 'wc-26',
    titleKey: 'shop.paidTitle',
    cost: PACK_PRICE,
    cardsPerPack: CARDS_PER_PACK,
    cooldownMs: 0,
    poolId: 'standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
  kdv: {
    id: 'kdv',
    albumId: 'tomsk',
    titleKey: 'shop.kdv.title',
    cost: KDV_BLISTER_COST,
    cardsPerPack: KDV_BLISTER_CARD_COUNT,
    cooldownMs: KDV_BLISTER_COOLDOWN_MS,
    poolId: 'standard',
    rarityOdds: PACK_CONFIGS.standard.rarityOdds,
  },
} satisfies Record<string, BlisterConfig>

/** Стоимость, содержимое и расписание редких блистеров. */
export const RARE_SHOP_CONFIG = {
  price: 80,
  cardsPerPack: 4,
  missingCardChance: 0.8,
  offersPerRotation: 3,
  rotationDurationMs: 4 * 60 * 60 * 1_000,
  extensionDurationMs: 4 * 60 * 60 * 1_000,
}

/** Баланс энергии и начислений кликера. */
export const CLICKER_CONFIG = {
  baseReward: 1,
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
