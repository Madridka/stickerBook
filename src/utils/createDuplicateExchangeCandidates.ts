import type { PlayerCard } from '@/types'
import { weightedRandom } from '@/utils/weightedRandom'

// Выбирает разных кандидатов по игровым весам, исключая игроков из сданных повторок.
export const createDuplicateExchangeCandidates = (
  cards: PlayerCard[],
  excludedPlayerIds: Set<string>,
  candidateCount: number,
): string[] => {
  let pool: PlayerCard[] = cards.filter(
    ({ id, weight }): boolean => !excludedPlayerIds.has(id) && weight > 0,
  )
  if (pool.length < candidateCount) {
    throw new Error('Not enough cards for duplicate exchange')
  }

  const candidatePlayerIds: string[] = []
  while (candidatePlayerIds.length < candidateCount) {
    const candidate: PlayerCard = weightedRandom(pool)
    candidatePlayerIds.push(candidate.id)
    pool = pool.filter(({ id }): boolean => id !== candidate.id)
  }
  return candidatePlayerIds
}
