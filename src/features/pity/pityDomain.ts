import { PITY_CONFIG } from '@/config/gameBalance'
import type { PackOpeningReward } from '@/db/database'
import type { AlbumId, CardDefinition, NormalizedCardCatalog } from '@/types'
import { selectCardV2, type RandomSource, type RarityOdds } from '@/utils/dropEngine'

export interface CreatePityPackRewardsOptions {
  albumId: AlbumId
  catalogs: readonly NormalizedCardCatalog[]
  cardCount: number
  poolId: string
  rarityOdds: RarityOdds
  defaultSelectionWeight: number
  ownedPlayerIds: ReadonlySet<string>
  protectionArmed: boolean
  randomSource: RandomSource
  createInstanceId: () => string
}

export interface CreatePityPackRewardsResult {
  rewards: PackOpeningReward[]
  hasNewCard: boolean
  pityApplied: boolean
}

export const isPityCompletionEligible = (
  collectedCards: number,
  totalCards: number,
): boolean =>
  totalCards > 0 &&
  collectedCards < totalCards &&
  collectedCards / totalCards >= PITY_CONFIG.minCompletionRatio

export const shouldProtectPack = (dryPackCount: number): boolean =>
  dryPackCount >= PITY_CONFIG.dryPacksBeforeGuarantee

export const isPityPackTypeEligible = (
  blisterId: string,
  albumIds: readonly AlbumId[],
  pityEligible: boolean,
): boolean => pityEligible && blisterId !== 'rare' && albumIds.length === 1

// Оставляет исходные каталоги и их defaults, отсекая только уже собранные карточки.
export const createMissingOnlyCatalogs = (
  catalogs: readonly NormalizedCardCatalog[],
  ownedPlayerIds: ReadonlySet<string>,
): NormalizedCardCatalog[] =>
  catalogs
    .map(
      (catalog): NormalizedCardCatalog => ({
        ...catalog,
        cards: catalog.cards.filter(({ id }): boolean => !ownedPlayerIds.has(id)),
      }),
    )
    .filter(({ cards }): boolean => cards.length > 0)

const selectFromDropEngine = (
  options: CreatePityPackRewardsOptions,
  catalogs: readonly NormalizedCardCatalog[],
): CardDefinition =>
  selectCardV2({
    catalogs,
    packConfig: {
      cardsPerPack: options.cardCount,
      rarityOdds: options.rarityOdds,
    },
    poolId: options.poolId,
    defaultSelectionWeight: options.defaultSelectionWeight,
    randomSource: options.randomSource,
  }) as CardDefinition

// Генерирует слоты последовательно и вмешивается только в последний бесполезный слот.
export const createPityPackRewards = (
  options: CreatePityPackRewardsOptions,
): CreatePityPackRewardsResult => {
  const ownedPlayerIds: Set<string> = new Set(options.ownedPlayerIds)
  const rewards: PackOpeningReward[] = []
  let hasNewCard = false
  let pityApplied = false

  for (let index = 0; index < options.cardCount; index += 1) {
    const isLastSlot: boolean = index === options.cardCount - 1
    const missingCatalogs: NormalizedCardCatalog[] = createMissingOnlyCatalogs(
      options.catalogs,
      ownedPlayerIds,
    )
    const canForceMissing: boolean =
      options.protectionArmed &&
      PITY_CONFIG.guaranteedMissingCards > 0 &&
      !hasNewCard &&
      isLastSlot &&
      missingCatalogs.length > 0
    let card: CardDefinition

    if (canForceMissing) {
      try {
        card = selectFromDropEngine(options, missingCatalogs)
        pityApplied = true
      } catch {
        // В pool блистера может не оказаться доступных missing-карт — сохраняем обычный RNG.
        card = selectFromDropEngine(options, options.catalogs)
      }
    } else {
      card = selectFromDropEngine(options, options.catalogs)
    }

    const isDuplicate: boolean = ownedPlayerIds.has(card.id)
    ownedPlayerIds.add(card.id)
    if (!isDuplicate) hasNewCard = true
    rewards.push({
      instanceId: options.createInstanceId(),
      albumId: options.albumId,
      playerId: card.id,
      isDuplicate,
    })
  }

  return { rewards, hasNewCard, pityApplied }
}
