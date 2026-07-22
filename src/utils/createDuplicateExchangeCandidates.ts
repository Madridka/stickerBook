import { DROP_ENGINE_CONFIG, PACK_CONFIGS } from '../data/mainConst.ts'
import type { CardDefinition, NormalizedCardCatalog } from '../types/cardCatalog.ts'
import { selectCardV2, type RandomSource } from './dropEngine.ts'

// Сохраняет прежние правила обмена: исключает сданные карточки и возвращает разные ID.
export const createDuplicateExchangeCandidates = (
  catalogs: NormalizedCardCatalog[],
  excludedPlayerIds: Set<string>,
  candidateCount: number,
  randomSource: RandomSource = Math.random,
): string[] => {
  let availableCatalogs: NormalizedCardCatalog[] = catalogs.map((catalog) => ({
    ...catalog,
    cards: catalog.cards.filter((card) => !excludedPlayerIds.has(card.id)),
  }))
  const availableCount = availableCatalogs.reduce(
    (total, catalog) => total + catalog.cards.length,
    0,
  )
  if (availableCount < candidateCount) {
    throw new Error('Not enough cards for duplicate exchange')
  }

  const candidatePlayerIds: string[] = []
  while (candidatePlayerIds.length < candidateCount) {
    const candidate = selectCardV2({
      catalogs: availableCatalogs,
      packConfig: PACK_CONFIGS.standard,
      poolId: 'standard',
      defaultSelectionWeight: DROP_ENGINE_CONFIG.defaultSelectionWeight,
      randomSource,
    }) as CardDefinition
    candidatePlayerIds.push(candidate.id)
    availableCatalogs = availableCatalogs.map((catalog) => ({
      ...catalog,
      cards: catalog.cards.filter((card) => card.id !== candidate.id),
    }))
  }
  return candidatePlayerIds
}
