import { PACK_HUNT_CONFIG } from '@/config/miniGameConfig'

export type PackMiniGameId =
  | 'signal'
  | 'rack'
  | 'machine'
  | 'shell'
  | 'puzzle'
  | 'catch'
  | 'memory'
  | 'passCombo'

interface PackMiniGameOption {
  id: PackMiniGameId
  weight: number
}

export const isPackMiniGameId = (value: unknown): value is PackMiniGameId =>
  value === 'signal' ||
  value === 'rack' ||
  value === 'machine' ||
  value === 'shell' ||
  value === 'puzzle' ||
  value === 'catch' ||
  value === 'memory' ||
  value === 'passCombo'

// Выбирает мини-игру по настраиваемым весам из игровых данных.
export const getEnabledPackMiniGameIds = (): PackMiniGameId[] =>
  PACK_HUNT_CONFIG.games
    .filter(({ id, weight }): boolean => isPackMiniGameId(id) && weight > 0)
    .map(({ id }): PackMiniGameId => id as PackMiniGameId)

// Исключает недавно завершённые игры, пока игрок не увидит всю доступную ротацию.
export const selectPackMiniGame = (
  recentGameIds: readonly PackMiniGameId[] = [],
): PackMiniGameId => {
  const options: PackMiniGameOption[] = PACK_HUNT_CONFIG.games
    .filter(({ id, weight }): boolean => isPackMiniGameId(id) && weight > 0)
    .map(({ id, weight }): PackMiniGameOption => ({ id: id as PackMiniGameId, weight }))
  const recentGames: Set<PackMiniGameId> = new Set(recentGameIds)
  const freshOptions: PackMiniGameOption[] = options.filter(
    ({ id }): boolean => !recentGames.has(id),
  )
  const lastGameId: PackMiniGameId | undefined = recentGameIds[recentGameIds.length - 1]
  const nextCycleOptions: PackMiniGameOption[] = options.filter(
    ({ id }): boolean => options.length === 1 || id !== lastGameId,
  )
  const selectableOptions: PackMiniGameOption[] =
    freshOptions.length > 0 ? freshOptions : nextCycleOptions
  const totalWeight: number = selectableOptions.reduce(
    (total: number, { weight }: PackMiniGameOption): number => total + weight,
    0,
  )

  if (totalWeight <= 0) return 'signal'

  let cursor: number = Math.random() * totalWeight
  for (const option of selectableOptions) {
    cursor -= option.weight
    if (cursor < 0) return option.id
  }

  return selectableOptions[selectableOptions.length - 1]?.id ?? 'signal'
}

export const appendRecentPackMiniGame = (
  recentGameIds: readonly PackMiniGameId[],
  completedGameId: PackMiniGameId,
): PackMiniGameId[] => {
  const enabledGameIds: PackMiniGameId[] = getEnabledPackMiniGameIds()
  const enabledGames: Set<PackMiniGameId> = new Set(enabledGameIds)
  const validHistory: PackMiniGameId[] = [
    ...new Set(recentGameIds.filter((id): boolean => enabledGames.has(id))),
  ]

  if (enabledGameIds.length <= 1) return []
  if (validHistory.length >= enabledGameIds.length) return [completedGameId]

  return [...validHistory.filter((id): boolean => id !== completedGameId), completedGameId]
}
