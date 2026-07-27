import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database } from '@/db/database'
import { promoteDuplicate } from '@/db/stickerLifecycle'
import type { DeletedCard, StickerInstance } from '@/types'
import { createId } from '@/utils/createId'

const DELETED_CARD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

export const useDeletedCardsStore = defineStore('deletedCards', () => {
  const items: Ref<DeletedCard[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)
  let expirationTimer: ReturnType<typeof setTimeout> | undefined

  const scheduleExpiration = (): void => {
    if (expirationTimer) clearTimeout(expirationTimer)
    const oldest: DeletedCard | undefined = items.value[items.value.length - 1]
    if (!oldest) return

    const delay: number = Math.max(0, oldest.deletedAt + DELETED_CARD_RETENTION_MS - Date.now())
    expirationTimer = setTimeout((): void => {
      void load()
    }, delay)
  }

  // Восстанавливает журнал удалённых карточек из IndexedDB.
  const load = async (): Promise<void> => {
    const cutoff: number = Date.now() - DELETED_CARD_RETENTION_MS
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

          for (const playerId of new Set(expired.map((item): string => item.playerId))) {
            const activeCard: StickerInstance | undefined = await database.cards
              .where('playerId')
              .equals(playerId)
              .filter(({ location }): boolean => location !== 'deleted')
              .first()
            if (!activeCard) await promoteDuplicate(playerId)
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
    if (!deletedCard || deletedCard.deletedAt + DELETED_CARD_RETENTION_MS <= Date.now()) {
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
          .where('playerId')
          .equals(deletedCard.playerId)
          .filter(
            (candidate: StickerInstance): boolean =>
              candidate.id !== instanceId && candidate.location !== 'deleted',
          )
          .first()

        if (activeCard) {
          const restoredDuplicate: StickerInstance = { ...instance, location: 'duplicate' }
          delete restoredDuplicate.placement
          delete restoredDuplicate.preparation
          delete restoredDuplicate.isAlbumDisplay
          await database.cards.delete(instanceId)
          await database.duplicates.put(restoredDuplicate)
        } else {
          await database.cards.update(instanceId, {
            location: deletedCard.previousLocation ?? 'inventory',
          })
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
