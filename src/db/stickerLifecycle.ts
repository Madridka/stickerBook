import { database } from '@/db/database'
import type { StickerInstance } from '@/types'
import type { AlbumId } from '@/types'

export const promoteDuplicate = async (
  albumId: AlbumId,
  playerId: string,
): Promise<StickerInstance | undefined> => {
  const duplicate: StickerInstance | undefined = await database.duplicates
    .where('[albumId+playerId]')
    .equals([albumId, playerId])
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
      const activeCardKeys: Set<string> = new Set(
        cards.map(({ albumId, playerId }): string => `${albumId}:${playerId}`),
      )

      for (const duplicate of duplicates) {
        const cardKey: string = `${duplicate.albumId}:${duplicate.playerId}`
        if (activeCardKeys.has(cardKey)) continue
        const promoted: StickerInstance | undefined = await promoteDuplicate(
          duplicate.albumId,
          duplicate.playerId,
        )
        if (promoted) activeCardKeys.add(cardKey)
      }
    },
  )
}
