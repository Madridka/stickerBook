import { PACK_HUNT_CONFIG } from '@/data/mainConst'

export type PackMiniGameId = 'signal' | 'rack' | 'machine' | 'shell' | 'puzzle' | 'catch'

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
  value === 'catch'

// Выбирает мини-игру по настраиваемым весам из игровых данных.
export const selectPackMiniGame = (): PackMiniGameId => {
  const options: PackMiniGameOption[] = PACK_HUNT_CONFIG.games
    .filter(({ id, weight }): boolean => isPackMiniGameId(id) && weight > 0)
    .map(({ id, weight }): PackMiniGameOption => ({ id: id as PackMiniGameId, weight }))
  const totalWeight: number = options.reduce(
    (total: number, { weight }: PackMiniGameOption): number => total + weight,
    0,
  )

  if (totalWeight <= 0) return 'signal'

  let cursor: number = Math.random() * totalWeight
  for (const option of options) {
    cursor -= option.weight
    if (cursor < 0) return option.id
  }

  return options[options.length - 1]?.id ?? 'signal'
}
