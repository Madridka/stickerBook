import { database } from '@/db/database'
import { getPlayerAlbumById } from '@/data/albumRegistry'
import { createId } from '@/utils/createId'
import type { AlbumId, StickerInstance } from '@/types'

// Добавляет карточку в коллекцию либо в повторки по единым правилам всех наград.
export const storeCardInstance = async (
  albumId: AlbumId,
  playerId: string,
  instanceId: string = createId(),
): Promise<StickerInstance> => {
  const targetAlbum = getPlayerAlbumById(albumId)
  if (!targetAlbum?.cards.some(({ id }): boolean => id === playerId)) {
    throw new Error(`Unknown or inaccessible card ${albumId}:${playerId}`)
  }
  const instance: StickerInstance = {
    id: instanceId,
    albumId,
    playerId,
    quality: 100,
    location: 'inventory',
  }
  const card: StickerInstance | undefined = await database.cards
    .where('[albumId+playerId]')
    .equals([albumId, playerId])
    .filter(({ location }): boolean => location !== 'deleted')
    .first()
  if (!card) {
    await database.cards.add(instance)
    return instance
  }

  const duplicate: StickerInstance = { ...instance, location: 'duplicate' }
  await database.duplicates.add(duplicate)
  return duplicate
}

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
