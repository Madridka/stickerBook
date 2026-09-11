import type { PlayerCardDefinition } from '@/types'
import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'

export const shuffleMiniGameItems = <T>(items: readonly T[]): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[target]] = [result[target]!, result[index]!]
  }
  return result
}

export const loadMiniGamePlayers = async (): Promise<PlayerCardDefinition[]> => {
  const { default: cards } = await import('@/data/ucl-26-27/catalog')
  return cards.filter((card): card is PlayerCardDefinition => card.kind === 'player')
}

export const createSortingCards = (pool: readonly PlayerCardDefinition[]): PlayerCardDefinition[] => {
  const config = PACK_HUNT_CONFIG.sort
  const selected: PlayerCardDefinition[] = []
  for (const rarity of config.categories) {
    const candidates = shuffleMiniGameItems(pool.filter((card) => card.rarity === rarity))
    const count = config.cards / config.categories.length
    if (candidates.length < count) throw new Error(`Insufficient cards for ${rarity}`)
    selected.push(...candidates.slice(0, count))
  }
  return shuffleMiniGameItems(selected)
}

export const createOddCards = (pool: readonly PlayerCardDefinition[]): PlayerCardDefinition[] => {
  const config = PACK_HUNT_CONFIG.odd
  // Версии одного футболиста не должны подменять трёх разных игроков клуба.
  const unique = [...new Map(pool.map((card) => [`${card.teamId}:${card.personId}`, card])).values()]
  const teams = shuffleMiniGameItems([...new Set(unique.map((card) => card.teamId))])
    .filter((team) => unique.filter((card) => card.teamId === team).length >= config.sameClubCount)
  if (teams.length < 2) throw new Error('Insufficient clubs for odd sticker')
  return Array.from({ length: config.rounds }, (_, round) => {
    const main = round === 0 ? config.firstClubs[0]! : teams[(round * 2) % teams.length]!
    const other = round === 0 ? config.firstClubs[1]! : teams[(round * 2 + 1) % teams.length]!
    const same = shuffleMiniGameItems(unique.filter((card) => card.teamId === main)).slice(0, config.sameClubCount)
    const odd = shuffleMiniGameItems(unique.filter((card) => card.teamId === other))[0]
    if (same.length !== config.sameClubCount || !odd) throw new Error('Missing club cards')
    return shuffleMiniGameItems([...same, odd])
  }).flat()
}
