import { database } from '@/db/database'
import type { StickerInstance } from '@/types'

export const promoteDuplicate = async (
  playerId: string,
): Promise<StickerInstance | undefined> => {
  const duplicate: StickerInstance | undefined = await database.duplicates
    .where('playerId')
    .equals(playerId)
    .first()
  if (!duplicate) return undefined

  const promoted: StickerInstance = { ...duplicate, location: 'inventory' }
  delete promoted.placement
  delete promoted.preparation

  await database.duplicates.delete(duplicate.id)
  await database.cards.add(promoted)
  return promoted
}

export const reconcileOrphanedDuplicates = async (): Promise<void> => {
  await database.transaction(
    'rw',
    database.cards,
    database.duplicates,
    async (): Promise<void> => {
      const cards: StickerInstance[] = await database.cards.toArray()
      const duplicates: StickerInstance[] = await database.duplicates.toArray()
      const activePlayerIds: Set<string> = new Set(
        cards
          .filter(({ location }): boolean => location !== 'deleted')
          .map(({ playerId }): string => playerId),
      )

      for (const duplicate of duplicates) {
        if (activePlayerIds.has(duplicate.playerId)) continue
        const promoted: StickerInstance | undefined = await promoteDuplicate(duplicate.playerId)
        if (promoted) activePlayerIds.add(promoted.playerId)
      }
    },
  )
}
