import { ref, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database } from '@/db/database'
import type { DeletedCard, StickerInstance } from '@/types'
import { createId } from '@/utils/createId'

export const useDeletedCardsStore = defineStore('deletedCards', () => {
  const items: Ref<DeletedCard[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)

  // Восстанавливает журнал удалённых карточек из IndexedDB.
  const load = async (): Promise<void> => {
    items.value = await database.deletedCards.orderBy('deletedAt').reverse().toArray()
    isLoaded.value = true
  }

  // Помечает карточку удалённой и сохраняет неизменяемую запись в отдельном журнале.
  const removeCard = async (instance: StickerInstance): Promise<void> => {
    const deletedCard: DeletedCard = {
      id: createId(),
      instanceId: instance.id,
      playerId: instance.playerId,
      deletedAt: Date.now(),
    }
    await database.transaction('rw', database.cards, database.deletedCards, async (): Promise<void> => {
      await database.cards.update(instance.id, { location: 'deleted' })
      await database.deletedCards.add(deletedCard)
    })
    items.value = [deletedCard, ...items.value]
  }

  void load()

  return { items, isLoaded, load, removeCard }
})
