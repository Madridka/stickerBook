import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database } from '@/db/database'
import { promoteDuplicate } from '@/db/stickerLifecycle'
import type { DeletedCard, StickerInstance } from '@/types'
import { createId } from '@/utils/createId'
import { DELETED_CARD_CONFIG } from '@/data/mainConst'

const normalizeRestoredCard = (
  instance: StickerInstance,
  location: 'inventory' | 'duplicate',
): StickerInstance => {
  const restored: StickerInstance = {
    ...instance,
    quality: DELETED_CARD_CONFIG.restoredQuality,
    location,
    preparation: {
      quality: DELETED_CARD_CONFIG.restoredQuality,
      alignmentX: 0,
      alignmentY: 0,
    },
  }
  delete restored.placement
  delete restored.isAlbumDisplay
  return restored
}

export const useDeletedCardsStore = defineStore('deletedCards', () => {
  const items: Ref<DeletedCard[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)
  let expirationTimer: ReturnType<typeof setTimeout> | undefined

  const scheduleExpiration = (): void => {
    if (expirationTimer) clearTimeout(expirationTimer)
    const oldest: DeletedCard | undefined = items.value[items.value.length - 1]
    if (!oldest) return

    const delay: number = Math.max(
      0,
      oldest.deletedAt + DELETED_CARD_CONFIG.retentionMs - Date.now(),
    )
    expirationTimer = setTimeout((): void => {
      void load()
    }, delay)
  }

  // Восстанавливает журнал удалённых карточек из IndexedDB.
  const load = async (): Promise<void> => {
    const cutoff: number = Date.now() - DELETED_CARD_CONFIG.retentionMs
    const expired: DeletedCard[] = await database.deletedCards
      .where('deletedAt')
      .belowOrEqual(cutoff)
      .toArray()

    if (expired.length) {
      await database.transaction(
        'rw',
        database.cards,
        database.duplicates,
        database.deletedCards,
        async (): Promise<void> => {
          await database.cards.bulkDelete(expired.map(({ instanceId }): string => instanceId))
          await database.deletedCards.bulkDelete(expired.map(({ id }): string => id))

          for (const item of expired) {
            const activeCard: StickerInstance | undefined = await database.cards
              .where('[albumId+playerId]')
              .equals([item.albumId, item.playerId])
              .filter(({ location }): boolean => location !== 'deleted')
              .first()
            if (!activeCard) await promoteDuplicate(item.albumId, item.playerId)
          }
        },
      )
    }

    items.value = await database.deletedCards.orderBy('deletedAt').reverse().toArray()
    isLoaded.value = true
    scheduleExpiration()
  }

  // Помечает карточку удалённой и сохраняет неизменяемую запись в отдельном журнале.
  const removeCard = async (instance: StickerInstance): Promise<void> => {
    const deletedCard: DeletedCard = {
      id: createId(),
      albumId: instance.albumId,
      instanceId: instance.id,
      playerId: instance.playerId,
      deletedAt: Date.now(),
      previousLocation:
        instance.location === 'deleted' || instance.location === 'duplicate'
          ? 'inventory'
          : instance.location,
    }
    await database.transaction(
      'rw',
      database.cards,
      database.duplicates,
      database.deletedCards,
      async (): Promise<void> => {
        await database.cards.update(instance.id, { location: 'deleted' })
        await database.deletedCards.add(deletedCard)
      },
    )
    items.value = [deletedCard, ...items.value]
    scheduleExpiration()
  }

  const restoreCard = async (instanceId: string): Promise<void> => {
    const deletedCard: DeletedCard | undefined = await database.deletedCards
      .where('instanceId')
      .equals(instanceId)
      .first()
    if (
      !deletedCard ||
      deletedCard.deletedAt + DELETED_CARD_CONFIG.retentionMs <= Date.now()
    ) {
      await load()
      return
    }

    await database.transaction(
      'rw',
      database.cards,
      database.duplicates,
      database.deletedCards,
      async (): Promise<void> => {
        const instance: StickerInstance | undefined = await database.cards.get(instanceId)
        if (!instance) {
          await database.deletedCards.delete(deletedCard.id)
          return
        }

        const activeCard: StickerInstance | undefined = await database.cards
          .where('[albumId+playerId]')
          .equals([deletedCard.albumId, deletedCard.playerId])
          .filter(
            (candidate: StickerInstance): boolean =>
              candidate.id !== instanceId && candidate.location !== 'deleted',
          )
          .first()

        if (activeCard) {
          const restoredDuplicate: StickerInstance = normalizeRestoredCard(instance, 'duplicate')
          await database.cards.delete(instanceId)
          await database.duplicates.put(restoredDuplicate)
        } else {
          await database.cards.put(normalizeRestoredCard(instance, 'inventory'))
        }
        await database.deletedCards.delete(deletedCard.id)
      },
    )

    items.value = items.value.filter(({ instanceId: id }): boolean => id !== instanceId)
    scheduleExpiration()
  }

  void load()

  return { items, isLoaded, load, removeCard, restoreCard }
})
