import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { defineStore } from 'pinia'
import { database } from '@/db/database'
import type { CollectionItem, StickerInstance } from '@/types'
import collectionData from '@/data/collection.json'

export const useCollectionStore = defineStore('collection', () => {
  const items: Ref<CollectionItem[]> = ref([])
  const isLoaded: Ref<boolean> = ref(false)

  // Загружает общие параметры коллекции из JSON-данных
  const total: number = collectionData.total
  const pages: number = collectionData.pages

  // Восстанавливает уже открытые карточки из локальной коллекции
  const load = async (): Promise<void> => {
    const cards: StickerInstance[] = await database.cards.toArray()
    const duplicates: StickerInstance[] = await database.duplicates.toArray()
    items.value = cards.map((instance: StickerInstance): CollectionItem => ({
      instance,
      duplicateCount: duplicates.filter(({ playerId }): boolean => playerId === instance.playerId).length,
    }))
    isLoaded.value = true
  }

  // Добавляет карточку в коллекцию и не создаёт лишнюю запись при повторном выпадении
  const addCard = async (playerId: string): Promise<StickerInstance> => {
    const instance: StickerInstance = { id: crypto.randomUUID(), playerId, quality: 100, location: 'collection' }
    const isDuplicate: boolean = await database.transaction(
      'rw', database.cards, database.duplicates,
      async (): Promise<boolean> => {
        const card: StickerInstance | undefined = await database.cards.where('playerId').equals(playerId).first()
        if (card) {
          await database.duplicates.add(instance)
          return true
        }
        await database.cards.add(instance)
        return false
      },
    )
    if (isDuplicate) {
      items.value = items.value.map((item: CollectionItem): CollectionItem =>
        item.instance.playerId === playerId ? { ...item, duplicateCount: item.duplicateCount + 1 } : item,
      )
    } else {
      items.value = [...items.value, { instance, duplicateCount: 0 }]
    }
    return instance
  }

  // Вычисляет процент найденных стикеров текущей коллекции
  const progress: ComputedRef<number> = computed((): number =>
    Math.round((items.value.length / total) * 100),
  )

  void load()

  return {
    items,
    collected: computed((): string[] => items.value.map(({ instance }): string => instance.playerId)),
    isLoaded,
    total,
    pages,
    progress,
    addCard,
  }
})
